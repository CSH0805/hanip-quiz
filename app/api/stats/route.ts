import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';
import { getStats } from '@/lib/queries';

export const runtime = 'nodejs';

export const GET = withUser(async (_req, userId) => {
  return NextResponse.json(await getStats(userId));
});
