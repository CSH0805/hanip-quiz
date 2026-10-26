import 'server-only';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db, withTransaction } from './db';
import { HttpError } from './api';
import type { DeckSummary, Difficulty, DraftQuestion, Question, Subject, WrongNote } from './constants';

// ───────────────────────── 공통 ─────────────────────────
// 모든 쿼리는 ? 플레이스홀더를 사용하고, 사용자 데이터는 항상 user_id 조건으로 제한한다.

type Row = RowDataPacket & Record<string, unknown>;

function toQuestion(r: Row): Question {
  return {
    id: r.id as number,
    deck_id: r.deck_id as number,
    question: r.question as string,
    choices: JSON.parse(r.choices_json as string) as string[],
    answer_index: r.answer_index as number,
    explanation: r.explanation as string,
  };
}

// ───────────────────────── 사용자 ─────────────────────────

export async function findUserByEmail(email: string) {
  const [rows] = await db.query<Row[]>(
    'SELECT id, email, password_hash, nickname FROM qz_users WHERE email = ? LIMIT 1',
    [email.toLowerCase()],
  );
  return rows[0] as { id: number; email: string; password_hash: string; nickname: string } | undefined;
}

export async function createUser(email: string, passwordHash: string, nickname: string) {
  try {
    const [res] = await db.query<ResultSetHeader>(
      'INSERT INTO qz_users (email, password_hash, nickname) VALUES (?, ?, ?)',
      [email.toLowerCase(), passwordHash, nickname],
    );
    return res.insertId;
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, '이미 가입된 이메일이에요.');
    }
    throw err;
  }
}

// ───────────────────────── 덱 ─────────────────────────

export async function listDecks(userId: number): Promise<DeckSummary[]> {
  const [rows] = await db.query<Row[]>(
    `SELECT d.id, d.title, d.subject, d.difficulty, d.is_ai, d.updated_at,
            COALESCE(qc.cnt, 0) AS question_count,
            best.best_score
       FROM qz_decks d
       LEFT JOIN (SELECT deck_id, COUNT(*) AS cnt FROM qz_questions GROUP BY deck_id) qc
              ON qc.deck_id = d.id
       LEFT JOIN (SELECT deck_id, MAX(ROUND(score * 100 / total)) AS best_score
                    FROM qz_attempts
                   WHERE user_id = ? AND mode = 'deck' AND total > 0
                   GROUP BY deck_id) best
              ON best.deck_id = d.id
      WHERE d.user_id = ?
      ORDER BY d.updated_at DESC, d.id DESC`,
    [userId, userId],
  );
  return rows.map((r) => ({
    ...(r as unknown as DeckSummary),
    question_count: Number(r.question_count),
    best_score: r.best_score == null ? null : Number(r.best_score),
  }));
}

export async function getDeck(userId: number, deckId: number) {
  const [rows] = await db.query<Row[]>(
    `SELECT id, title, subject, difficulty, source_text, is_ai, created_at, updated_at
       FROM qz_decks WHERE id = ? AND user_id = ? LIMIT 1`,
    [deckId, userId],
  );
  const deck = rows[0];
  if (!deck) return null;
  const [qs] = await db.query<Row[]>(
    `SELECT id, deck_id, question, choices_json, answer_index, explanation
       FROM qz_questions WHERE deck_id = ? ORDER BY id`,
    [deckId],
  );
  return {
    id: deck.id as number,
    title: deck.title as string,
    subject: deck.subject as Subject,
    difficulty: deck.difficulty as Difficulty,
    source_text: (deck.source_text as string | null) ?? null,
    is_ai: deck.is_ai as number,
    created_at: deck.created_at as string,
    updated_at: deck.updated_at as string,
    questions: qs.map(toQuestion),
  };
}

async function insertQuestions(conn: PoolConnection, deckId: number, questions: DraftQuestion[]) {
  for (const q of questions) {
    await conn.query(
      `INSERT INTO qz_questions (deck_id, question, choices_json, answer_index, explanation)
       VALUES (?, ?, ?, ?, ?)`,
      [deckId, q.question, JSON.stringify(q.choices), q.answer_index, q.explanation],
    );
  }
}

/** 덱 + 문제를 한 트랜잭션으로 저장 */
export async function createDeck(
  userId: number,
  input: { title: string; subject: Subject; difficulty: Difficulty; source_text: string | null; is_ai: boolean },
  questions: DraftQuestion[],
) {
  return withTransaction(async (conn) => {
    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO qz_decks (user_id, title, subject, difficulty, source_text, is_ai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, input.title, input.subject, input.difficulty, input.source_text, input.is_ai ? 1 : 0],
    );
    await insertQuestions(conn, res.insertId, questions);
    return res.insertId;
  });
}

export async function updateDeck(
  userId: number,
  deckId: number,
  input: { title: string; subject: Subject; difficulty: Difficulty },
) {
  const [res] = await db.query<ResultSetHeader>(
    'UPDATE qz_decks SET title = ?, subject = ?, difficulty = ? WHERE id = ? AND user_id = ?',
    [input.title, input.subject, input.difficulty, deckId, userId],
  );
  return res.affectedRows > 0;
}

export async function deleteDeck(userId: number, deckId: number) {
  const [res] = await db.query<ResultSetHeader>('DELETE FROM qz_decks WHERE id = ? AND user_id = ?', [
    deckId,
    userId,
  ]);
  return res.affectedRows > 0;
}

/** 덱의 수정 시각 갱신 (문제 추가·수정 시 홈 정렬에 반영) */
async function touchDeck(conn: PoolConnection, deckId: number) {
  await conn.query('UPDATE qz_decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [deckId]);
}

// ───────────────────────── 문제 ─────────────────────────

export async function addQuestion(userId: number, deckId: number, q: DraftQuestion) {
  return withTransaction(async (conn) => {
    const [own] = await conn.query<Row[]>('SELECT id FROM qz_decks WHERE id = ? AND user_id = ? FOR UPDATE', [
      deckId,
      userId,
    ]);
    if (own.length === 0) throw new HttpError(404, '덱을 찾을 수 없어요.');
    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO qz_questions (deck_id, question, choices_json, answer_index, explanation)
       VALUES (?, ?, ?, ?, ?)`,
      [deckId, q.question, JSON.stringify(q.choices), q.answer_index, q.explanation],
    );
    await touchDeck(conn, deckId);
    return res.insertId;
  });
}

export async function updateQuestion(userId: number, questionId: number, q: DraftQuestion) {
  // JOIN으로 덱 소유자를 확인해 남의 문제는 수정되지 않게 한다.
  const [res] = await db.query<ResultSetHeader>(
    `UPDATE qz_questions q
       JOIN qz_decks d ON d.id = q.deck_id
        SET q.question = ?, q.choices_json = ?, q.answer_index = ?, q.explanation = ?,
            d.updated_at = CURRENT_TIMESTAMP
      WHERE q.id = ? AND d.user_id = ?`,
    [q.question, JSON.stringify(q.choices), q.answer_index, q.explanation, questionId, userId],
  );
  return res.affectedRows > 0;
}

export async function deleteQuestion(userId: number, questionId: number) {
  const [res] = await db.query<ResultSetHeader>(
    `DELETE q FROM qz_questions q
       JOIN qz_decks d ON d.id = q.deck_id
      WHERE q.id = ? AND d.user_id = ?`,
    [questionId, userId],
  );
  return res.affectedRows > 0;
}

// ───────────────────────── 풀이 기록 ─────────────────────────

export type AnswerInput = { questionId: number; chosenIndex: number };

/** 정답은 서버에서 DB 값으로 다시 채점한 뒤 attempts + answers 를 트랜잭션으로 저장 */
export async function saveAttempt(
  userId: number,
  mode: 'deck' | 'review',
  deckId: number | null,
  answers: AnswerInput[],
) {
  const ids = [...new Set(answers.map((a) => a.questionId))];
  if (ids.length !== answers.length) throw new HttpError(400, '같은 문제가 중복으로 들어 있어요.');

  const [rows] = await db.query<Row[]>(
    `SELECT q.id, q.deck_id, q.answer_index
       FROM qz_questions q
       JOIN qz_decks d ON d.id = q.deck_id
      WHERE d.user_id = ? AND q.id IN (?)`,
    [userId, ids],
  );
  const byId = new Map(rows.map((r) => [r.id as number, r]));
  if (byId.size !== ids.length) throw new HttpError(400, '풀 수 없는 문제가 섞여 있어요.');
  if (mode === 'deck' && rows.some((r) => r.deck_id !== deckId)) {
    throw new HttpError(400, '다른 덱의 문제가 섞여 있어요.');
  }

  const graded = answers.map((a) => {
    const answerIndex = byId.get(a.questionId)!.answer_index as number;
    return { ...a, answerIndex, isCorrect: a.chosenIndex === answerIndex };
  });
  const score = graded.filter((g) => g.isCorrect).length;

  const attemptId = await withTransaction(async (conn) => {
    const [res] = await conn.query<ResultSetHeader>(
      'INSERT INTO qz_attempts (user_id, deck_id, mode, score, total) VALUES (?, ?, ?, ?, ?)',
      [userId, mode === 'deck' ? deckId : null, mode, score, graded.length],
    );
    const values = graded.map((g) => [res.insertId, g.questionId, userId, g.chosenIndex, g.isCorrect ? 1 : 0]);
    await conn.query(
      'INSERT INTO qz_answers (attempt_id, question_id, user_id, chosen_index, is_correct) VALUES ?',
      [values],
    );
    return res.insertId;
  });

  return { attemptId, score, total: graded.length, results: graded };
}

// ───────────────────────── 오답노트 ─────────────────────────
// 문제별 '가장 최근 응답'(MAX(id))이 오답인 문제만 모은다. 윈도 함수 없이 서브쿼리로 계산.

const LATEST_ANSWERS = `
  SELECT question_id, MAX(id) AS last_id
    FROM qz_answers
   WHERE user_id = ?
   GROUP BY question_id`;

export async function listWrongNotes(userId: number, subject?: Subject): Promise<WrongNote[]> {
  const params: unknown[] = [userId, userId];
  let subjectFilter = '';
  if (subject) {
    subjectFilter = 'AND d.subject = ?';
    params.push(subject);
  }
  const [rows] = await db.query<Row[]>(
    `SELECT q.id, q.deck_id, q.question, q.choices_json, q.answer_index, q.explanation,
            d.title AS deck_title, d.subject, a.chosen_index, a.created_at AS answered_at
       FROM (${LATEST_ANSWERS}) latest
       JOIN qz_answers a   ON a.id = latest.last_id
       JOIN qz_questions q ON q.id = a.question_id
       JOIN qz_decks d     ON d.id = q.deck_id
      WHERE a.is_correct = 0 AND d.user_id = ? ${subjectFilter}
      ORDER BY a.id DESC`,
    params,
  );
  return rows.map((r) => ({
    ...toQuestion(r),
    deck_title: r.deck_title as string,
    subject: r.subject as Subject,
    chosen_index: r.chosen_index as number,
    answered_at: r.answered_at as string,
  }));
}

export async function countWrongNotes(userId: number): Promise<number> {
  const [rows] = await db.query<Row[]>(
    `SELECT COUNT(*) AS cnt
       FROM (${LATEST_ANSWERS}) latest
       JOIN qz_answers a   ON a.id = latest.last_id
       JOIN qz_questions q ON q.id = a.question_id
       JOIN qz_decks d     ON d.id = q.deck_id
      WHERE a.is_correct = 0 AND d.user_id = ?`,
    [userId, userId],
  );
  return Number(rows[0]?.cnt ?? 0);
}

// ───────────────────────── 통계 ─────────────────────────

export async function getStats(userId: number) {
  const [[overall]] = await db.query<Row[]>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct,
            COUNT(DISTINCT attempt_id) AS attempts
       FROM qz_answers WHERE user_id = ?`,
    [userId],
  );

  const [bySubject] = await db.query<Row[]>(
    `SELECT d.subject, COUNT(*) AS total, SUM(a.is_correct) AS correct
       FROM qz_answers a
       JOIN qz_questions q ON q.id = a.question_id
       JOIN qz_decks d     ON d.id = q.deck_id
      WHERE a.user_id = ? AND d.user_id = ?
      GROUP BY d.subject
      ORDER BY total DESC`,
    [userId, userId],
  );

  // 세션 시간대가 +09:00 이므로 DATE()·CURDATE()는 한국 날짜 기준
  const [daily] = await db.query<Row[]>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS total, SUM(is_correct) AS correct
       FROM qz_answers
      WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day`,
    [userId],
  );

  const [topWrong] = await db.query<Row[]>(
    `SELECT q.id, q.question, d.id AS deck_id, d.title AS deck_title, d.subject,
            COUNT(*) AS wrong_count
       FROM qz_answers a
       JOIN qz_questions q ON q.id = a.question_id
       JOIN qz_decks d     ON d.id = q.deck_id
      WHERE a.user_id = ? AND d.user_id = ? AND a.is_correct = 0
      GROUP BY q.id, q.question, d.id, d.title, d.subject
      ORDER BY wrong_count DESC, q.id DESC
      LIMIT 5`,
    [userId, userId],
  );

  // 최근 7일(오늘 포함)을 빈 날 없이 채운다 — 날짜는 한국 시간 기준
  const counts = new Map(daily.map((r) => [String(r.day), r]));
  const days = [];
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
  for (let i = 6; i >= 0; i--) {
    const day = fmt.format(new Date(Date.now() - i * 86400000));
    const r = counts.get(day);
    days.push({ day, total: Number(r?.total ?? 0), correct: Number(r?.correct ?? 0) });
  }

  return {
    overall: {
      total: Number(overall.total),
      correct: Number(overall.correct),
      attempts: Number(overall.attempts),
    },
    bySubject: bySubject.map((r) => ({
      subject: r.subject as Subject,
      total: Number(r.total),
      correct: Number(r.correct),
    })),
    daily: days,
    topWrong: topWrong.map((r) => ({
      id: r.id as number,
      question: r.question as string,
      deck_id: r.deck_id as number,
      deck_title: r.deck_title as string,
      subject: r.subject as Subject,
      wrong_count: Number(r.wrong_count),
    })),
  };
}

// ───────────────────────── AI 피드백 ─────────────────────────

export async function saveFeedback(userId: number, feedback: unknown) {
  const [res] = await db.query<ResultSetHeader>(
    'INSERT INTO qz_ai_feedback (user_id, feedback_json) VALUES (?, ?)',
    [userId, JSON.stringify(feedback)],
  );
  return res.insertId;
}

export async function listFeedback(userId: number, limit = 10) {
  const [rows] = await db.query<Row[]>(
    `SELECT id, feedback_json, created_at FROM qz_ai_feedback
      WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map((r) => ({
    id: r.id as number,
    created_at: r.created_at as string,
    ...(JSON.parse(r.feedback_json as string) as { summary: string; weak_points: string[]; study_tips: string[] }),
  }));
}
