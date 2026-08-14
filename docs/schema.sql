PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(course_id, slug)
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content_version INTEGER NOT NULL DEFAULT 1,
  estimated_minutes INTEGER NOT NULL CHECK(estimated_minutes > 0),
  position INTEGER NOT NULL,
  UNIQUE(module_id, slug)
);

CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specification_json TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specification_json TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  specification_json TEXT NOT NULL
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  source_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  compiler TEXT NOT NULL,
  flags_json TEXT NOT NULL,
  status TEXT NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE TABLE progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('available', 'started', 'completed', 'review')),
  study_seconds INTEGER NOT NULL DEFAULT 0 CHECK(study_seconds >= 0),
  mastery REAL NOT NULL DEFAULT 0 CHECK(mastery BETWEEN 0 AND 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, lesson_id)
);

CREATE TABLE code_workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('c', 'cpp')),
  files_json TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_lessons_module_position ON lessons(module_id, position);
CREATE INDEX idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX idx_executions_submission ON executions(submission_id);

