import type { ProgressSnapshot } from "@0xlab/contracts";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { EMPTY_PROGRESS, type ProgressRepository } from "@/domain/progress/progress";

let database: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (database) return database;
  const path = process.env.DATABASE_PATH ?? join(process.cwd(), ".data", "0xlab.db");
  mkdirSync(dirname(path), { recursive: true });
  database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS progress_snapshots (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      completed_lesson_ids TEXT NOT NULL DEFAULT '[]',
      completed_exercise_ids TEXT NOT NULL DEFAULT '[]',
      completed_challenge_ids TEXT NOT NULL DEFAULT '[]',
      study_minutes INTEGER NOT NULL DEFAULT 0 CHECK(study_minutes >= 0),
      last_lesson_id TEXT,
      updated_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO users (id, display_name) VALUES ('local', 'Local developer');
  `);
  return database;
}

function parseStringArray(value: string): readonly string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

interface ProgressRow {
  completed_lesson_ids: string;
  completed_exercise_ids: string;
  completed_challenge_ids: string;
  study_minutes: number;
  last_lesson_id: string | null;
  updated_at: string;
}

export class SqliteProgressRepository implements ProgressRepository {
  async get(userId: string): Promise<ProgressSnapshot> {
    const row = getDatabase().prepare(`
      SELECT completed_lesson_ids, completed_exercise_ids, completed_challenge_ids,
             study_minutes, last_lesson_id, updated_at
      FROM progress_snapshots WHERE user_id = ?
    `).get(userId) as ProgressRow | undefined;
    if (!row) return EMPTY_PROGRESS;
    return {
      completedLessonIds: parseStringArray(row.completed_lesson_ids),
      completedExerciseIds: parseStringArray(row.completed_exercise_ids),
      completedChallengeIds: parseStringArray(row.completed_challenge_ids),
      studyMinutes: row.study_minutes,
      lastLessonId: row.last_lesson_id,
      updatedAt: row.updated_at
    };
  }

  async save(userId: string, snapshot: ProgressSnapshot): Promise<void> {
    getDatabase().prepare(`
      INSERT INTO progress_snapshots (
        user_id, completed_lesson_ids, completed_exercise_ids, completed_challenge_ids,
        study_minutes, last_lesson_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        completed_lesson_ids = excluded.completed_lesson_ids,
        completed_exercise_ids = excluded.completed_exercise_ids,
        completed_challenge_ids = excluded.completed_challenge_ids,
        study_minutes = excluded.study_minutes,
        last_lesson_id = excluded.last_lesson_id,
        updated_at = excluded.updated_at
    `).run(
      userId,
      JSON.stringify(snapshot.completedLessonIds),
      JSON.stringify(snapshot.completedExerciseIds),
      JSON.stringify(snapshot.completedChallengeIds),
      snapshot.studyMinutes,
      snapshot.lastLessonId,
      snapshot.updatedAt
    );
  }
}

