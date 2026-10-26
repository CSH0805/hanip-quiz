// 데모 계정 + 샘플 덱/문제/풀이 기록 시드 스크립트
// 여러 번 실행해도 중복되지 않는다 (같은 제목의 덱이 있으면 건너뛰고, 풀이 기록은 비어 있을 때만 넣는다).
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

const DEMO_EMAIL = 'demo@hanipquiz.com';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NICKNAME = '체험러';

const decks = [
  {
    title: '네트워크 기초',
    subject: '정보',
    difficulty: '보통',
    questions: [
      {
        question: 'IP 주소를 이용해 같은 네트워크 장비의 MAC 주소를 알아내는 프로토콜은?',
        choices: ['DNS', 'ARP', 'DHCP', 'HTTP'],
        answer: 1,
        explanation: 'ARP(Address Resolution Protocol)는 IP 주소를 물리 주소인 MAC 주소로 변환합니다.',
      },
      {
        question: '연결 지향적이며 데이터의 순서와 신뢰성 있는 전달을 보장하는 전송 계층 프로토콜은?',
        choices: ['UDP', 'IP', 'TCP', 'ICMP'],
        answer: 2,
        explanation: 'TCP는 3-way handshake로 연결을 맺고, 재전송·순서 제어로 신뢰성을 보장합니다. UDP는 비연결형입니다.',
      },
      {
        question: 'www.example.com 같은 도메인 이름을 IP 주소로 바꿔 주는 시스템은?',
        choices: ['DNS', 'FTP', 'SMTP', 'NAT'],
        answer: 0,
        explanation: 'DNS(Domain Name System)는 사람이 읽기 쉬운 도메인 이름을 IP 주소로 변환합니다.',
      },
      {
        question: 'OSI 7계층 중 라우터가 IP 주소를 보고 경로를 결정하는 계층은?',
        choices: ['물리 계층', '데이터 링크 계층', '네트워크 계층', '응용 계층'],
        answer: 2,
        explanation: '라우터는 3계층인 네트워크 계층에서 IP 주소를 기준으로 패킷의 경로(라우팅)를 정합니다.',
      },
      {
        question: 'IPv4 주소의 길이는 몇 비트인가?',
        choices: ['16비트', '32비트', '64비트', '128비트'],
        answer: 1,
        explanation: 'IPv4는 32비트(8비트 × 4), IPv6는 128비트 주소를 사용합니다.',
      },
    ],
  },
  {
    title: '고등 필수 단어',
    subject: '영어',
    difficulty: '쉬움',
    questions: [
      {
        question: "'abundant'의 뜻으로 가장 알맞은 것은?",
        choices: ['부족한', '풍부한', '위험한', '일시적인'],
        answer: 1,
        explanation: 'abundant는 "풍부한, 많은"이라는 뜻입니다. 반대말은 scarce(부족한)입니다.',
      },
      {
        question: "'reluctant'의 뜻으로 가장 알맞은 것은?",
        choices: ['기꺼이 하는', '꺼리는, 마지못한', '신중한', '열정적인'],
        answer: 1,
        explanation: 'reluctant는 "꺼리는, 마지못해 하는"이라는 뜻입니다. 반대말은 willing(기꺼이 하는)입니다.',
      },
      {
        question: "'inevitable'의 뜻으로 가장 알맞은 것은?",
        choices: ['피할 수 없는', '믿을 수 없는', '보이지 않는', '잊을 수 없는'],
        answer: 0,
        explanation: 'inevitable은 "피할 수 없는, 필연적인"이라는 뜻입니다.',
      },
      {
        question: "'diminish'의 뜻으로 가장 알맞은 것은?",
        choices: ['증가하다', '유지하다', '줄어들다', '비교하다'],
        answer: 2,
        explanation: 'diminish는 "줄어들다, 감소하다"라는 뜻으로 decrease와 비슷합니다.',
      },
      {
        question: "'comprehensive'의 뜻으로 가장 알맞은 것은?",
        choices: ['포괄적인', '경쟁적인', '이해할 수 있는', '압축된'],
        answer: 0,
        explanation: 'comprehensive는 "포괄적인, 종합적인"입니다. "이해할 수 있는"은 comprehensible이니 헷갈리지 마세요.',
      },
    ],
  },
  {
    title: '한국사 근현대',
    subject: '사회',
    difficulty: '보통',
    questions: [
      {
        question: '1876년 조선이 일본과 맺은 최초의 근대적 조약이자 불평등 조약은?',
        choices: ['강화도 조약', '시모노세키 조약', '을사늑약', '톈진 조약'],
        answer: 0,
        explanation: '강화도 조약(조일수호조규, 1876)은 부산 등 3개 항구 개항과 치외 법권을 인정한 불평등 조약입니다.',
      },
      {
        question: '1919년 3·1 운동 이후 중국 상하이에서 수립된 정부는?',
        choices: ['대한 제국', '대한민국 임시 정부', '조선 총독부', '통감부'],
        answer: 1,
        explanation: '3·1 운동을 계기로 1919년 4월 상하이에서 대한민국 임시 정부가 수립되었습니다.',
      },
      {
        question: '1894년 전봉준 등이 중심이 되어 반봉건·반외세를 내걸고 일어난 운동은?',
        choices: ['임오군란', '갑신정변', '동학 농민 운동', '아관 파천'],
        answer: 2,
        explanation: '동학 농민 운동(1894)은 고부 군수의 횡포에 맞서 시작되어 반봉건·반외세를 주장했습니다.',
      },
      {
        question: '1948년 8월 15일에 있었던 사건은?',
        choices: ['8·15 광복', '대한민국 정부 수립', '6·25 전쟁 발발', '4·19 혁명'],
        answer: 1,
        explanation: '광복은 1945년 8월 15일, 대한민국 정부 수립은 1948년 8월 15일입니다.',
      },
      {
        question: '1960년 3·15 부정 선거에 항의하여 학생과 시민이 일으킨 민주 혁명은?',
        choices: ['5·18 민주화 운동', '6월 민주 항쟁', '4·19 혁명', '부마 민주 항쟁'],
        answer: 2,
        explanation: '4·19 혁명(1960)으로 이승만 정부가 물러났습니다. 6월 민주 항쟁은 1987년입니다.',
      },
    ],
  },
];

// 풀이 기록: [덱 인덱스, 며칠 전, 문제별 고른 보기(정답과 다르면 오답)]
const attempts = [
  [0, 3, [1, 0, 0, 1, 1]], // 네트워크: 2번·4번 오답
  [1, 1, [1, 0, 0, 2, 2]], // 영어: 2번·5번 오답
  [2, 0, [0, 1, 2, 0, 2]], // 한국사: 4번 오답
];

const conn = await mysql.createConnection({
  host: env('DB_HOST', 'localhost'),
  port: Number(env('DB_PORT', '3306')) || 3306,
  user: env('DB_USER'),
  password: env('DB_PASSWORD'),
  database: env('DB_NAME'),
  ssl: env('DB_SSL') === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

try {
  await conn.query("SET time_zone = '+09:00'");
  await conn.beginTransaction();

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await conn.execute(
    `INSERT INTO qz_users (email, password_hash, nickname) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [DEMO_EMAIL, hash, DEMO_NICKNAME],
  );
  const [[user]] = await conn.execute('SELECT id FROM qz_users WHERE email = ?', [DEMO_EMAIL]);
  const userId = user.id;

  const deckIds = [];
  const questionIds = [];
  for (const deck of decks) {
    const [found] = await conn.execute(
      'SELECT id FROM qz_decks WHERE user_id = ? AND title = ? LIMIT 1',
      [userId, deck.title],
    );
    if (found.length > 0) {
      const deckId = found[0].id;
      const [qs] = await conn.execute(
        'SELECT id FROM qz_questions WHERE deck_id = ? ORDER BY id',
        [deckId],
      );
      deckIds.push(deckId);
      questionIds.push(qs.map((q) => q.id));
      console.log(`· 덱 "${deck.title}" 이미 있음 → 건너뜀`);
      continue;
    }
    const [res] = await conn.execute(
      'INSERT INTO qz_decks (user_id, title, subject, difficulty, is_ai) VALUES (?, ?, ?, ?, 0)',
      [userId, deck.title, deck.subject, deck.difficulty],
    );
    const ids = [];
    for (const q of deck.questions) {
      const [qr] = await conn.execute(
        'INSERT INTO qz_questions (deck_id, question, choices_json, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
        [res.insertId, q.question, JSON.stringify(q.choices), q.answer, q.explanation],
      );
      ids.push(qr.insertId);
    }
    deckIds.push(res.insertId);
    questionIds.push(ids);
    console.log(`· 덱 "${deck.title}" 문제 ${ids.length}개 추가`);
  }

  const [[{ cnt }]] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM qz_attempts WHERE user_id = ?',
    [userId],
  );
  if (cnt === 0) {
    for (const [deckIdx, daysAgo, chosen] of attempts) {
      const qs = decks[deckIdx].questions;
      const ids = questionIds[deckIdx];
      if (ids.length !== qs.length) continue;
      const score = chosen.filter((c, i) => c === qs[i].answer).length;
      const [ar] = await conn.execute(
        `INSERT INTO qz_attempts (user_id, deck_id, mode, score, total, created_at)
         VALUES (?, ?, 'deck', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [userId, deckIds[deckIdx], score, qs.length, daysAgo],
      );
      for (let i = 0; i < qs.length; i++) {
        await conn.execute(
          `INSERT INTO qz_answers (attempt_id, question_id, user_id, chosen_index, is_correct, created_at)
           VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [ar.insertId, ids[i], userId, chosen[i], chosen[i] === qs[i].answer ? 1 : 0, daysAgo],
        );
      }
    }
    console.log(`· 풀이 기록 ${attempts.length}개 추가`);
  } else {
    console.log('· 풀이 기록 이미 있음 → 건너뜀');
  }

  await conn.commit();
  console.log(`✅ 시드 완료 (데모 계정: ${DEMO_EMAIL} / ${DEMO_PASSWORD})`);
} catch (err) {
  await conn.rollback();
  console.error('❌ 시드 실패:', err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
