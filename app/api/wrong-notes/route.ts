import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';
import { SUBJECTS, type Subject } from '@/lib/constants';
import { listWrongNotes } from '@/lib/queries';

export const runtime = 'nodejs';

export const GET = withUser(async (req, userId) => {
  const raw = new URL(req.url).searchParams.get('subject');
  const subject = SUBJECTS.includes(raw as Subject) ? (raw as Subject) : undefined;
  return NextResponse.json({ notes: await listWrongNotes(userId, subject) });
});
