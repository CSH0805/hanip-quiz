-- 한입퀴즈 스키마 (MySQL 8 / TiDB 호환)
-- 다른 프로젝트와 DB를 공유하므로 모든 테이블은 qz_ 접두어를 사용한다.
-- 트리거·프로시저·이벤트·윈도 함수는 사용하지 않는다.

CREATE TABLE IF NOT EXISTS qz_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nickname      VARCHAR(30)  NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qz_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qz_decks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(100) NOT NULL,
  subject     ENUM('국어','영어','수학','과학','사회','정보','기타') NOT NULL DEFAULT '기타',
  difficulty  ENUM('쉬움','보통','어려움') NOT NULL DEFAULT '보통',
  source_text TEXT NULL,
  is_ai       TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qz_decks_user (user_id),
  CONSTRAINT fk_qz_decks_user FOREIGN KEY (user_id) REFERENCES qz_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qz_questions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  deck_id      INT UNSIGNED NOT NULL,
  question     TEXT NOT NULL,
  choices_json TEXT NOT NULL,
  answer_index TINYINT UNSIGNED NOT NULL,
  explanation  TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qz_questions_deck (deck_id),
  CONSTRAINT fk_qz_questions_deck FOREIGN KEY (deck_id) REFERENCES qz_decks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qz_attempts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  deck_id    INT UNSIGNED NULL,
  mode       ENUM('deck','review') NOT NULL DEFAULT 'deck',
  score      INT UNSIGNED NOT NULL,
  total      INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qz_attempts_user (user_id, created_at),
  KEY idx_qz_attempts_deck (deck_id),
  CONSTRAINT fk_qz_attempts_user FOREIGN KEY (user_id) REFERENCES qz_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_qz_attempts_deck FOREIGN KEY (deck_id) REFERENCES qz_decks (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qz_answers (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id   INT UNSIGNED NOT NULL,
  question_id  INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  chosen_index TINYINT UNSIGNED NOT NULL,
  is_correct   TINYINT(1) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qz_answers_user_q (user_id, question_id),
  KEY idx_qz_answers_user_time (user_id, created_at),
  CONSTRAINT fk_qz_answers_attempt FOREIGN KEY (attempt_id) REFERENCES qz_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_qz_answers_question FOREIGN KEY (question_id) REFERENCES qz_questions (id) ON DELETE CASCADE,
  CONSTRAINT fk_qz_answers_user FOREIGN KEY (user_id) REFERENCES qz_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qz_ai_feedback (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  feedback_json TEXT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qz_ai_feedback_user (user_id, created_at),
  CONSTRAINT fk_qz_ai_feedback_user FOREIGN KEY (user_id) REFERENCES qz_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
