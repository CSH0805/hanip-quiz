import { NextResponse } from 'next/server';
import { parseId, readJson, withUser } from '@/lib/api';
import { addQuestion } from '@/lib/queries';
import * as v from '@/lib/validate';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withUser<Ctx>(async (req, userId, { params }) => {
  const deckId = parseId((await params).id);
  const q = v.question(await readJson(req));
  const id = await addQuestion(userId, deckId, q);
  return NextResponse.json({ id }, { status: 201 });
});
