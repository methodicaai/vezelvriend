// Database of the AI box: trainings, participants with a login code, every
// prompt that was sent with the AI's answer, and work that participants handed
// in from their own AI.
//
// Unlike the fake company systems, this database is real and persistent: it
// lives on a Docker volume and survives restarts and updates, so the trainer
// can look back at who sent what and when. It holds personal data (names of
// participants and whatever they typed), which is why codes are stored only
// as hashes and the trainer can delete a training with everything in it.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS trainings (
  training_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1   -- codes only work while the training is active
);

CREATE TABLE IF NOT EXISTS participants (
  participant_id INTEGER PRIMARY KEY,
  training_id    INTEGER NOT NULL REFERENCES trainings(training_id) ON DELETE CASCADE,
  label          TEXT NOT NULL,             -- name or 'Deelnemer 3', chosen by the trainer
  code_hash      TEXT NOT NULL UNIQUE,      -- sha256 of the login code; the code itself is shown once
  created_at     TEXT NOT NULL,
  last_login_at  TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  message_id     INTEGER PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
  sent_at        TEXT NOT NULL,
  exercise       TEXT,                      -- e.g. '01-context'
  prompt_block   TEXT,                      -- heading above the prompt, e.g. 'Voorbeeldprompt met context (B)'
  prompt         TEXT NOT NULL,
  answer         TEXT,
  status         TEXT NOT NULL CHECK (status IN ('ok', 'refusal', 'error')),
  error          TEXT,
  model          TEXT,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  duration_ms    INTEGER
);

CREATE INDEX IF NOT EXISTS messages_by_participant ON messages(participant_id, sent_at);

-- Work handed in by participants who used their own AI (e.g. Copilot at work).
-- Only what the participant chooses to paste in; nothing is collected automatically.
CREATE TABLE IF NOT EXISTS submissions (
  submission_id  INTEGER PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
  submitted_at   TEXT NOT NULL,
  exercise       TEXT,
  prompt_block   TEXT,
  tool           TEXT,                      -- e.g. 'Microsoft Copilot', as chosen by the participant
  prompt         TEXT NOT NULL,
  answer         TEXT NOT NULL,
  note           TEXT
);

CREATE INDEX IF NOT EXISTS submissions_by_participant ON submissions(participant_id, submitted_at);
`;

// No 0/O, 1/I/L: codes are read aloud and typed over from paper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const hashCode = (code) =>
  crypto.createHash('sha256').update(code.trim().toUpperCase().replace(/\s+/g, '')).digest('hex');

function newCode() {
  const pick = () => ALPHABET[crypto.randomInt(ALPHABET.length)];
  const group = () => Array.from({ length: 4 }, pick).join('');
  return `VV-${group()}-${group()}`;
}

const nowIso = () => new Date().toISOString();

export function openStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);

  const store = {
    db,

    createTraining(name, labels) {
      db.exec('BEGIN');
      try {
        const { lastInsertRowid } = db.prepare('INSERT INTO trainings (name, created_at) VALUES (?, ?)').run(name, nowIso());
        const created = labels.map((label) => ({ label, code: store.addParticipant(Number(lastInsertRowid), label) }));
        db.exec('COMMIT');
        return { trainingId: Number(lastInsertRowid), participants: created };
      } catch (err) { db.exec('ROLLBACK'); throw err; }
    },

    /** Adds a participant and returns the plain code. It is not stored, only its hash. */
    addParticipant(trainingId, label) {
      for (;;) {
        const code = newCode();
        try {
          db.prepare('INSERT INTO participants (training_id, label, code_hash, created_at) VALUES (?, ?, ?, ?)')
            .run(trainingId, label, hashCode(code), nowIso());
          return code;
        } catch (err) {
          if (!String(err.message).includes('UNIQUE')) throw err; // extremely rare collision: try again
        }
      }
    },

    resetCode(participantId) {
      for (;;) {
        const code = newCode();
        try {
          db.prepare('UPDATE participants SET code_hash = ? WHERE participant_id = ?').run(hashCode(code), participantId);
          return code;
        } catch (err) {
          if (!String(err.message).includes('UNIQUE')) throw err;
        }
      }
    },

    /** Finds the participant for a code, only while the training is active. */
    login(code) {
      const p = db.prepare(`
        SELECT p.participant_id, p.label, t.name AS training_name
        FROM participants p JOIN trainings t ON t.training_id = p.training_id
        WHERE p.code_hash = ? AND t.active = 1`).get(hashCode(code));
      if (p) db.prepare('UPDATE participants SET last_login_at = ? WHERE participant_id = ?').run(nowIso(), p.participant_id);
      return p ?? null;
    },

    activeParticipant(participantId) {
      return db.prepare(`
        SELECT p.participant_id, p.label, t.name AS training_name
        FROM participants p JOIN trainings t ON t.training_id = p.training_id
        WHERE p.participant_id = ? AND t.active = 1`).get(participantId) ?? null;
    },

    countToday(participantId) {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      return db.prepare("SELECT COUNT(*) AS n FROM messages WHERE participant_id = ? AND sent_at >= ? AND status <> 'error'")
        .get(participantId, since.toISOString()).n;
    },

    saveMessage(m) {
      db.prepare(`INSERT INTO messages (participant_id, sent_at, exercise, prompt_block, prompt, answer, status, error,
                                        model, input_tokens, output_tokens, duration_ms)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(m.participantId, nowIso(), m.exercise ?? null, m.promptBlock ?? null, m.prompt, m.answer ?? null,
          m.status, m.error ?? null, m.model ?? null, m.inputTokens ?? null, m.outputTokens ?? null, m.durationMs ?? null);
    },

    saveSubmission(m) {
      db.prepare(`INSERT INTO submissions (participant_id, submitted_at, exercise, prompt_block, tool, prompt, answer, note)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(m.participantId, nowIso(), m.exercise ?? null, m.promptBlock ?? null, m.tool ?? null, m.prompt, m.answer, m.note ?? null);
    },

    countSubmissionsToday(participantId) {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      return db.prepare('SELECT COUNT(*) AS n FROM submissions WHERE participant_id = ? AND submitted_at >= ?').get(participantId, since.toISOString()).n;
    },

    submissions(trainingId, participantId = null) {
      return db.prepare(`
        SELECT s.*, p.label FROM submissions s JOIN participants p ON p.participant_id = s.participant_id
        WHERE p.training_id = ? AND (? IS NULL OR p.participant_id = ?)
        ORDER BY s.submitted_at DESC`).all(trainingId, participantId, participantId);
    },

    trainings() {
      return db.prepare(`
        SELECT t.*, (SELECT COUNT(*) FROM participants p WHERE p.training_id = t.training_id) AS participants,
               (SELECT COUNT(*) FROM messages m JOIN participants p ON p.participant_id = m.participant_id
                 WHERE p.training_id = t.training_id) AS messages,
               (SELECT COUNT(*) FROM submissions s JOIN participants p ON p.participant_id = s.participant_id
                 WHERE p.training_id = t.training_id) AS submissions
        FROM trainings t ORDER BY t.created_at DESC`).all();
    },

    training(trainingId) {
      return db.prepare('SELECT * FROM trainings WHERE training_id = ?').get(trainingId) ?? null;
    },

    participants(trainingId) {
      return db.prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM messages m WHERE m.participant_id = p.participant_id) AS messages,
               (SELECT COUNT(*) FROM submissions s WHERE s.participant_id = p.participant_id) AS submissions
        FROM participants p WHERE p.training_id = ? ORDER BY p.participant_id`).all(trainingId);
    },

    messages(trainingId, participantId = null) {
      return db.prepare(`
        SELECT m.*, p.label FROM messages m JOIN participants p ON p.participant_id = m.participant_id
        WHERE p.training_id = ? AND (? IS NULL OR p.participant_id = ?)
        ORDER BY m.sent_at DESC`).all(trainingId, participantId, participantId);
    },

    setActive(trainingId, active) {
      db.prepare('UPDATE trainings SET active = ? WHERE training_id = ?').run(active ? 1 : 0, trainingId);
    },

    deleteTraining(trainingId) {
      db.prepare('DELETE FROM trainings WHERE training_id = ?').run(trainingId); // cascades to participants and messages
    },
  };
  return store;
}
