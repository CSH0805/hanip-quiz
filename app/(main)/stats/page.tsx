import Link from 'next/link';
import { requirePageUser } from '@/lib/auth';
import { SUBJECT_STYLE } from '@/lib/constants';
import { getStats } from '@/lib/queries';
import { EmptyState } from '@/components/States';

export const runtime = 'nodejs';
export const metadata = { title: '통계 · 한입퀴즈' };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default async function StatsPage() {
  const user = await requirePageUser();
  const { overall, bySubject, daily, topWrong } = await getStats(user.uid);

  if (overall.total === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="아직 통계가 없어요"
        desc="퀴즈를 한 번 풀면 과목별 정답률과 학습 기록이 나타나요."
        action={{ href: '/', label: '퀴즈 풀러 가기' }}
      />
    );
  }

  const rate = Math.round((overall.correct / overall.total) * 100);
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));
  const weekTotal = daily.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black tracking-tight">📊 내 학습 통계</h1>

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: '푼 문제', value: overall.total, unit: '개', color: 'text-white' },
          { label: '전체 정답률', value: rate, unit: '%', color: 'text-lime' },
          { label: '퀴즈 횟수', value: overall.attempts, unit: '회', color: 'text-pink' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center sm:p-6">
            <p className="text-xs font-bold text-muted sm:text-sm">{s.label}</p>
            <p className={`num mt-1 text-3xl sm:text-5xl ${s.color}`}>
              {s.value}
              <span className="text-base sm:text-xl">{s.unit}</span>
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 최근 7일 */}
        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">최근 7일 푼 문제</h2>
            <span className="text-sm text-muted">
              이번 주 <b className="num text-white">{weekTotal}</b>개
            </span>
          </div>
          <div className="mt-6 flex h-48 items-end gap-2" role="img" aria-label="최근 7일 날짜별 푼 문제 수 막대 그래프">
            {daily.map((d, i) => {
              const isToday = i === daily.length - 1;
              const [y, m, dd] = d.day.split('-').map(Number);
              const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="num text-sm">{d.total > 0 ? d.total : ''}</span>
                  <div
                    className={`w-full max-w-12 rounded-t-xl transition-all ${
                      isToday ? 'bg-lime shadow-[0_0_18px_rgba(198,255,61,0.5)]' : 'bg-gradient-to-t from-[#8b3dff] to-pink'
                    }`}
                    style={{ height: d.total > 0 ? `${(d.total / maxDaily) * 75}%` : '4px', opacity: d.total > 0 ? 1 : 0.25 }}
                    title={`${d.day}: ${d.total}문제 중 ${d.correct}개 정답`}
                  />
                  <span className={`text-xs font-bold ${isToday ? 'text-lime' : 'text-muted'}`}>
                    {isToday ? '오늘' : `${m}/${dd}`}
                    <br />
                    <span className="font-normal opacity-70">{weekday}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 과목별 정답률 */}
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">과목별 정답률</h2>
          <ul className="mt-5 space-y-4">
            {bySubject.map((s) => {
              const st = SUBJECT_STYLE[s.subject];
              const r = Math.round((s.correct / s.total) * 100);
              return (
                <li key={s.subject}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-bold">
                      {st.emoji} {s.subject}
                    </span>
                    <span className="text-muted">
                      <b className="num text-lg" style={{ color: st.color }}>
                        {r}%
                      </b>{' '}
                      ({s.correct}/{s.total})
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${r}%`, background: st.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* 많이 틀린 문제 */}
      <section className="card p-6">
        <h2 className="text-lg font-extrabold">🔥 가장 많이 틀린 문제 TOP 5</h2>
        {topWrong.length === 0 ? (
          <p className="mt-4 text-muted">틀린 문제가 하나도 없어요. 대단해요! 🏆</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {topWrong.map((q, i) => (
              <li key={q.id}>
                <Link
                  href={`/decks/${q.deck_id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <span className={`num w-8 text-center text-2xl ${i === 0 ? 'text-pink' : 'text-muted'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{q.question}</p>
                    <p className="text-xs text-muted">
                      {SUBJECT_STYLE[q.subject].emoji} {q.deck_title}
                    </p>
                  </div>
                  <span className="num shrink-0 rounded-full bg-bad/20 px-3 py-1 text-sm text-[#ffb3c1]">
                    {q.wrong_count}회
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
