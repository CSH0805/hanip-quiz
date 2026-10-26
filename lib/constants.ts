// 서버·클라이언트 공용 상수와 타입
export const SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '정보', '기타'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const DIFFICULTIES = ['쉬움', '보통', '어려움'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SUBJECT_STYLE: Record<Subject, { emoji: string; color: string; soft: string }> = {
  국어: { emoji: '📖', color: '#ff8a3d', soft: 'rgba(255,138,61,0.16)' },
  영어: { emoji: '🔤', color: '#3dd6ff', soft: 'rgba(61,214,255,0.16)' },
  수학: { emoji: '📐', color: '#a78bfa', soft: 'rgba(167,139,250,0.18)' },
  과학: { emoji: '🧪', color: '#4ade80', soft: 'rgba(74,222,128,0.16)' },
  사회: { emoji: '🏛️', color: '#facc15', soft: 'rgba(250,204,21,0.16)' },
  정보: { emoji: '💻', color: '#c6ff3d', soft: 'rgba(198,255,61,0.16)' },
  기타: { emoji: '🎲', color: '#ff3d9a', soft: 'rgba(255,61,154,0.16)' },
};

export const AI_SOURCE_MAX = 3000;

export type Question = {
  id: number;
  deck_id: number;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
};

export type DeckSummary = {
  id: number;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  is_ai: number;
  question_count: number;
  best_score: number | null;
  updated_at: string;
};

export type WrongNote = Question & {
  deck_title: string;
  subject: Subject;
  chosen_index: number;
  answered_at: string;
};

export type DraftQuestion = {
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
};

export type AiFeedback = {
  summary: string;
  weak_points: string[];
  study_tips: string[];
};
