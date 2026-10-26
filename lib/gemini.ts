import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { env } from './env';
import { HttpError } from './api';
import { SUBJECTS, type AiFeedback, type Difficulty, type DraftQuestion, type Subject } from './constants';

// Gemini 호출은 모두 이 파일에서만 한다. (API 라우트 = 서버에서만 import)

export const AI_RESTING_MESSAGE = 'AI가 잠시 쉬고 있어요. 직접 문제를 추가해 보세요.';

const SYSTEM_INSTRUCTION = `너는 한국 중·고등학생을 위한 학습 퀴즈 출제자이자 학습 코치야.
- 모든 답변은 자연스러운 한국어로 작성해. (영어 단어 문제처럼 원문이 필요한 경우만 예외)
- 사실관계가 정확한 내용만 다루고, 확실하지 않은 내용은 문제로 내지 마.
- 반드시 지정된 JSON 스키마에 맞게만 응답해.`;

function client() {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey || apiKey === '여기에_내_키_입력') throw new HttpError(503, AI_RESTING_MESSAGE);
  return new GoogleGenAI({ apiKey });
}

function model() {
  return env('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
}

async function generateJson(prompt: string, schema: object, temperature: number): Promise<unknown> {
  const ai = client();
  try {
    const res = await ai.models.generateContent({
      model: model(),
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature,
      },
    });
    const text = res.text;
    if (!text) throw new Error('빈 응답');
    return JSON.parse(text);
  } catch (err) {
    // 한도 초과(429)·키 오류·네트워크 문제 모두 같은 안내로 처리하고, 앱은 계속 동작하게 한다.
    console.error('[gemini]', err);
    throw new HttpError(503, AI_RESTING_MESSAGE);
  }
}

// ───────────────────────── 퀴즈 생성 ─────────────────────────

const quizSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: '덱 제목 (20자 이내)' },
    subject: { type: Type.STRING, enum: [...SUBJECTS] },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          choices: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: '4', maxItems: '4' },
          answer_index: { type: Type.INTEGER, description: '정답 보기의 0부터 시작하는 번호 (0~3)' },
          explanation: { type: Type.STRING, description: '정답인 이유를 1~2문장으로' },
        },
        required: ['question', 'choices', 'answer_index', 'explanation'],
        propertyOrdering: ['question', 'choices', 'answer_index', 'explanation'],
      },
    },
  },
  required: ['title', 'subject', 'questions'],
  propertyOrdering: ['title', 'subject', 'questions'],
};

export type QuizRequest = {
  sourceText: string | null;
  subject: Subject | null;
  topic: string | null;
  count: 5 | 10;
  difficulty: Difficulty;
};

/** 보기 순서를 섞어 정답이 한 번호에 몰리지 않게 한다 */
function shuffleChoices(q: DraftQuestion): DraftQuestion {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return {
    ...q,
    choices: order.map((i) => q.choices[i]),
    answer_index: order.indexOf(q.answer_index),
  };
}

/** AI가 준 문제를 서버에서 한 번 더 검증한다. 형식이 이상한 문제는 버린다. */
function sanitizeQuestions(raw: unknown, count: number): DraftQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: DraftQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    const choices = Array.isArray(q.choices) ? q.choices.map((c) => (typeof c === 'string' ? c.trim() : '')) : [];
    const answer = q.answer_index;
    if (!question || question.length > 1000 || seen.has(question)) continue;
    if (choices.length !== 4 || choices.some((c) => !c || c.length > 200)) continue;
    if (new Set(choices).size !== 4) continue; // 보기 중복
    if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3) continue;
    seen.add(question);
    out.push(
      shuffleChoices({
        question,
        choices,
        answer_index: answer as number,
        explanation: typeof q.explanation === 'string' ? q.explanation.trim().slice(0, 2000) : '',
      }),
    );
    if (out.length === count) break;
  }
  return out;
}

export async function generateQuiz(req: QuizRequest) {
  const lines = [
    `객관식 4지선다 퀴즈를 정확히 ${req.count}문제 만들어 줘.`,
    `난이도: ${req.difficulty} (쉬움=기본 개념 확인, 보통=개념 적용, 어려움=응용·비교·함정 보기 포함)`,
    '규칙:',
    '- 보기는 반드시 4개, 정답은 하나뿐이어야 하고 나머지 3개는 그럴듯하지만 분명히 틀린 오답으로 만들어.',
    '- "모두 정답", "정답 없음" 같은 보기는 쓰지 마.',
    '- answer_index는 정답 보기의 번호(0~3)야.',
    '- 같은 내용을 묻는 문제를 반복하지 마.',
  ];
  if (req.sourceText) {
    lines.push(
      '- 아래 [학습 자료]에 나온 내용 안에서만 문제를 내. 자료에 없는 사실을 새로 추가하지 마.',
      '- subject는 학습 자료에 가장 알맞은 과목을 골라.',
      '',
      '[학습 자료]',
      req.sourceText,
      '[학습 자료 끝]',
    );
  } else {
    lines.push(`- 과목: ${req.subject}`, `- 주제: ${req.topic}`, `- subject는 "${req.subject}"로 해.`);
  }

  const data = (await generateJson(lines.join('\n'), quizSchema, 0.7)) as Record<string, unknown>;
  const questions = sanitizeQuestions(data?.questions, req.count);
  if (questions.length === 0) throw new HttpError(502, 'AI가 쓸 만한 문제를 만들지 못했어요. 다시 시도해 주세요.');

  const aiSubject = SUBJECTS.includes(data.subject as Subject) ? (data.subject as Subject) : '기타';
  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title.trim().slice(0, 100)
      : (req.topic ?? 'AI 퀴즈').slice(0, 100);

  return {
    title,
    subject: req.subject ?? aiSubject,
    difficulty: req.difficulty,
    questions,
    requested: req.count,
  };
}

// ───────────────────────── 오답 분석 ─────────────────────────

const feedbackSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: '전체 오답 경향 요약 (2~3문장)' },
    weak_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: '약점 개념 2~4개' },
    study_tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: '구체적인 공부 방법 2~4개' },
  },
  required: ['summary', 'weak_points', 'study_tips'],
  propertyOrdering: ['summary', 'weak_points', 'study_tips'],
};

export type WrongItem = { subject: string; question: string; chosen: string; answer: string };

export async function analyzeWrongAnswers(items: WrongItem[]): Promise<AiFeedback> {
  const list = items
    .map((it, i) => `${i + 1}. [${it.subject}] ${it.question}\n   - 내가 고른 답: ${it.chosen}\n   - 정답: ${it.answer}`)
    .join('\n');
  const prompt = `다음은 한 학생이 최근에 틀린 문제 목록이야.
틀린 패턴을 분석해서 학생에게 직접 말하듯 다정하지만 구체적으로 피드백해 줘.
- summary: 어떤 유형·개념에서 주로 틀리는지 요약
- weak_points: 보완이 필요한 개념을 짧은 문장으로
- study_tips: 바로 실천할 수 있는 공부 방법

[틀린 문제]
${list}`;

  const data = (await generateJson(prompt, feedbackSchema, 0.5)) as Record<string, unknown>;
  const strings = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()).slice(0, 6)
      : [];
  const summary = typeof data?.summary === 'string' ? data.summary.trim() : '';
  if (!summary) throw new HttpError(502, 'AI 분석 결과가 비어 있어요. 다시 시도해 주세요.');
  return { summary, weak_points: strings(data.weak_points), study_tips: strings(data.study_tips) };
}
