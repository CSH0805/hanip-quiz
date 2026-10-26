import { NextResponse } from 'next/server';
import { HttpError, parseId, readJson, withUser } from '@/lib/api';
import { deleteDeck, getDeck, updateDeck } from '@/lib/queries';
import * as v from '@/lib/validate';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_req, userId, { params }) => {
  const deck = await getDeck(userId, parseId((await params).id));
  if (!deck) throw new HttpError(404, '덱을 찾을 수 없어요.');
  return NextResponse.json({ deck });
});

export const PATCH = withUser<Ctx>(async (req, userId, { params }) => {
  const id = parseId((await params).id);
  const body = await readJson(req);
  const ok = await updateDeck(userId, id, {
    title: v.str(body.title, '덱 제목', { max: 100 }),
    subject: v.subject(body.subject),
    difficulty: v.difficulty(body.difficulty),
  });
  if (!ok) throw new HttpError(404, '덱을 찾을 수 없어요.');
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, userId, { params }) => {
  const ok = await deleteDeck(userId, parseId((await params).id));
  if (!ok) throw new HttpError(404, '덱을 찾을 수 없어요.');
  return NextResponse.json({ ok: true });
});
