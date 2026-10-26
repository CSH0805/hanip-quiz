import { NextResponse } from 'next/server';
import { HttpError, parseId, readJson, withUser } from '@/lib/api';
import { deleteQuestion, updateQuestion } from '@/lib/queries';
import * as v from '@/lib/validate';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser<Ctx>(async (req, userId, { params }) => {
  const id = parseId((await params).id);
  const q = v.question(await readJson(req));
  if (!(await updateQuestion(userId, id, q))) throw new HttpError(404, '문제를 찾을 수 없어요.');
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, userId, { params }) => {
  const id = parseId((await params).id);
  if (!(await deleteQuestion(userId, id))) throw new HttpError(404, '문제를 찾을 수 없어요.');
  return NextResponse.json({ ok: true });
});
