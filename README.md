# 🍙 한입퀴즈

공부한 내용을 붙여넣거나 과목·주제만 고르면 **AI가 객관식 퀴즈를 만들어 주는** 학습 서비스입니다.
클릭으로 풀면 채점과 **오답노트**가 자동으로 쌓이고, AI가 틀린 문제를 분석해 공부 방법을 알려 줍니다.

- 배포 주소: (여기에 Vercel 주소 입력)
- 체험 계정: 로그인 화면의 **「🎮 체험 계정으로 둘러보기」** 버튼 (또는 `demo@hanipquiz.com` / `demo1234`)

> 마이크·카메라 없이 클릭과 짧은 입력만으로 모든 기능을 체험할 수 있습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 회원가입 / 로그인 | bcrypt 비밀번호 해시 + JWT(httpOnly 쿠키). 체험 계정 원클릭 로그인 |
| 덱 · 문제 CRUD | 제목·과목·난이도 칩으로 덱 만들기/수정/삭제(확인 모달), 보기 4칸 + 정답 라디오로 문제 추가/수정/삭제 |
| 퀴즈 풀기 | 한 화면 한 문제, 진행 바, 정답(초록)/오답(빨강 흔들림) 즉시 표시 + 해설, 결과 점수 카운트업, 80점 이상 컨페티, 「틀린 것만 다시」 |
| 오답노트 | 문제별 **가장 최근 응답이 오답**인 문제 모음, 과목 필터, 「오답만 다시 풀기」(맞히면 자동으로 빠짐) |
| 통계 | 과목별 정답률, 최근 7일 날짜별 푼 문제 수 막대, 가장 많이 틀린 문제 TOP 5 (모두 SQL 집계) |
| ✨ AI로 퀴즈 만들기 | ① 공부 내용 붙여넣기(최대 3000자) 또는 ② 과목 + 주제 한 줄 → 5/10문제, 난이도 선택 → 미리보기에서 문제 제외 → 덱으로 저장 |
| 💡 AI 오답 분석 | 틀린 문제를 Gemini가 분석해 요약·약점·공부 팁 카드로 표시, 지난 분석 기록 보관 |

## 기술 스택

- **Next.js 16** (App Router, TypeScript, Route Handlers, `proxy.ts`) + **Tailwind CSS 4**
- **MySQL** + `mysql2/promise` — ORM 없이 SQL 직접 작성 (`lib/queries.ts`에 모든 쿼리)
- **Gemini API** — `@google/genai` 공식 SDK, 구조화 출력(`responseSchema`) (`lib/gemini.ts`)
- 인증: `bcryptjs` + `jose`(JWT) / 효과: `canvas-confetti` / 폰트: Pretendard(CDN)
- 배포: Vercel + TiDB Cloud(MySQL 호환)

## 폴더 구조

```
app/
  (auth)/login, signup        로그인·회원가입 화면
  (main)/                     로그인 후 화면 (상단 바 레이아웃)
    page.tsx                  홈: 덱 카드 그리드
    ai/                       AI로 퀴즈 만들기
    decks/new, decks/[id]     덱 만들기·상세(문제 CRUD)
    decks/[id]/play           퀴즈 풀기
    review/                   오답만 다시 풀기
    wrong-notes/, stats/      오답노트, 통계
  api/...                     Route Handler (아래 API 표)
components/                   UI 컴포넌트 (QuizPlayer, AiCreator, DeckDetail …)
lib/
  db.ts                       mysql2 커넥션 풀 + 트랜잭션 헬퍼
  queries.ts                  모든 SQL
  gemini.ts                   Gemini 호출 + 응답 검증
  session.ts / auth.ts        JWT 쿠키 세션
proxy.ts                      로그인 확인 (JWT만 검증, DB 조회 없음)
db/schema.sql                 테이블 정의
scripts/db-init.mjs, db-seed.mjs
```

## 테이블 구조

다른 프로젝트와 DB(`thoughtforge`)를 함께 쓰기 때문에 모든 테이블에 `qz_` 접두어를 붙였습니다.
트리거·프로시저·이벤트·윈도 함수는 쓰지 않습니다(TiDB·구버전 MySQL 호환).

| 테이블 | 주요 컬럼 | 설명 |
| --- | --- | --- |
| `qz_users` | id, email(UNIQUE, 소문자), password_hash, nickname, created_at | 사용자 |
| `qz_decks` | id, user_id(FK), title, subject, difficulty, source_text, is_ai, created_at, updated_at | 퀴즈 덱 |
| `qz_questions` | id, deck_id(FK, CASCADE), question, choices_json(보기 4개 JSON), answer_index(0~3), explanation | 문제 |
| `qz_attempts` | id, user_id, deck_id(NULL=복습), mode('deck'\|'review'), score, total, created_at | 한 번의 풀이 |
| `qz_answers` | id, attempt_id(FK, CASCADE), question_id(FK, CASCADE), user_id, chosen_index, is_correct | 문제별 응답 |
| `qz_ai_feedback` | id, user_id, feedback_json, created_at | AI 오답 분석 결과 |

**오답노트 쿼리** (윈도 함수 없이 `MAX(id)` 서브쿼리로 문제별 최근 응답을 구함):

```sql
SELECT q.*, d.title, d.subject, a.chosen_index
  FROM (SELECT question_id, MAX(id) AS last_id
          FROM qz_answers WHERE user_id = ? GROUP BY question_id) latest
  JOIN qz_answers a   ON a.id = latest.last_id
  JOIN qz_questions q ON q.id = a.question_id
  JOIN qz_decks d     ON d.id = q.deck_id
 WHERE a.is_correct = 0 AND d.user_id = ?
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/auth/signup` · `/login` · `/demo` · `/logout` | 인증 |
| GET · POST | `/api/decks` | 덱 목록 / 덱 생성 (`questions` 배열을 함께 보내면 덱+문제 트랜잭션 저장) |
| GET · PATCH · DELETE | `/api/decks/[id]` | 덱 상세 / 수정 / 삭제 |
| POST | `/api/decks/[id]/questions` | 문제 추가 |
| PATCH · DELETE | `/api/questions/[id]` | 문제 수정 / 삭제 |
| POST | `/api/attempts` | 풀이 결과 저장 (서버에서 다시 채점, 트랜잭션) |
| GET | `/api/wrong-notes?subject=` | 오답노트 |
| GET | `/api/stats` | 통계 |
| POST | `/api/ai/quiz` | AI 퀴즈 미리보기 생성 (저장 안 함) |
| GET · POST | `/api/ai/feedback` | AI 오답 분석 기록 / 새 분석 |

에러는 항상 `{ "error": "메시지" }` + 알맞은 상태 코드(400/401/404/409/503 …)로 응답합니다.

## 로컬 실행 방법

준비물: Node.js 20.6 이상(22 권장), 실행 중인 MySQL 8

```bash
npm install
# .env.example 을 복사해 .env.local 을 만들고 값 채우기 (아래 환경 변수 표 참고)
npm run db:init    # DB 생성 + 테이블 생성
npm run db:seed    # 데모 계정 + 샘플 덱 3개 + 풀이 기록
npm run dev        # http://localhost:3000
```

`db:seed`는 여러 번 실행해도 중복으로 쌓이지 않습니다.

## Vercel 배포

1. TiDB Cloud(Serverless)에서 클러스터를 만들고 접속 정보를 `.env.cloud`에 적은 뒤(`DB_PORT=4000`, `DB_SSL=true`)
   `npm run db:init:cloud` → `npm run db:seed:cloud` 실행
2. GitHub 저장소를 Vercel에 Import (Framework: Next.js, 설정 변경 없음 — `vercel.json` 불필요)
3. Vercel → Settings → Environment Variables 에 아래 값 입력

| 이름 | 예시 / 설명 |
| --- | --- |
| `DB_HOST` | `gateway01.xxx.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` (없으면 3306) |
| `DB_USER` | `xxxxxxxx.root` |
| `DB_PASSWORD` | TiDB 비밀번호 |
| `DB_NAME` | `thoughtforge` |
| `DB_SSL` | `true` (TLS 1.2 이상, 인증서 검증) |
| `GEMINI_API_KEY` | Google AI Studio에서 발급 (서버에서만 사용) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (없으면 이 값) |
| `SESSION_SECRET` | 32자 이상 랜덤 문자열 |

## 직접 정한 부분 (애매했던 요구사항)

- **「틀린 것만 다시」 결과 저장**: 결과 화면에서 틀린 문제만 다시 풀면 `mode='review'`, `deck_id=NULL`로 저장합니다.
  덱의 "내 최고 점수"는 덱 전체를 푼 `mode='deck'` 기록만으로 계산해, 틀린 문제만 다시 풀어 100점이 되는 식으로 부풀려지지 않게 했습니다.
- **오답만 다시 풀기**는 한 번에 최근 오답 최대 20문제까지 출제합니다. 오답노트에서 과목 필터를 고른 상태면 그 과목만 풉니다.
- **AI 보기 섞기**: AI는 정답을 앞쪽 보기에 몰아 두는 경향이 있어, 서버 검증 후 보기 순서를 섞고 `answer_index`를 다시 계산합니다.
- **AI 응답 검증**: 보기가 정확히 4개가 아니거나, 빈 보기·중복 보기가 있거나, `answer_index`가 0~3이 아니거나, 같은 문제가 반복되면 버립니다.
  요청한 문제 수보다 적게 남으면 남은 문제만 미리보기로 보여 주고 안내 문구를 띄웁니다(0개면 오류).
- **AI 오답 분석 입력**: 클라이언트가 보낸 데이터가 아니라 서버가 DB의 오답노트(최근 20문제)를 직접 읽어 Gemini에 보냅니다.
- **AI 실패 처리**: 키가 없거나, 한도 초과(429), 네트워크 오류 등은 모두 503 + "AI가 잠시 쉬고 있어요. 직접 문제를 추가해 보세요." 안내로 처리하고, 직접 만들기 버튼을 함께 보여 줍니다.
- **서버 재채점**: `/api/attempts`는 클라이언트가 보낸 정답 여부를 무시하고 DB의 `answer_index`로 다시 채점합니다.
  `deck` 모드는 모든 문제가 해당 덱 소속인지, `review` 모드는 모든 문제가 내 덱 소속인지 확인합니다.
- **한국 시간**: DB 커넥션마다 `SET time_zone = '+09:00'`을 실행해 `NOW()`, `CURDATE()`, `DATE()`가 서버 위치(Vercel은 UTC)와 상관없이 한국 시간 기준이 되게 했습니다.
  (TiDB·Windows MySQL에 시간대 테이블이 없어도 동작하도록 이름 대신 오프셋 사용, 한국은 서머타임이 없음)
- **체험 계정 로그인**은 비밀번호 없이 `demo@hanipquiz.com` 계정으로 로그인시키는 전용 API(`/api/auth/demo`)를 사용합니다. 체험 계정 데이터는 누구나 바꿀 수 있으니, 필요하면 `npm run db:seed`로 기본 덱을 다시 채울 수 있습니다(같은 제목 덱이 남아 있으면 건너뜀).
- **비밀번호** 6~72자 (bcrypt 72바이트 한계), **닉네임** 20자, **덱 제목** 100자, **AI 주제** 60자, **붙여넣기** 30~3000자.
- **덱 삭제** 시 문제와 문제별 응답(`qz_answers`)은 CASCADE로 함께 지워져 오답노트·통계에서도 빠집니다. 풀이 기록 행(`qz_attempts`)은 `deck_id`만 NULL이 되어 남습니다.
- Next 16 기본 템플릿의 `cacheComponents`는 로그인 쿠키에 따라 매번 다르게 그려지는 앱이라 끄고 사용합니다.
