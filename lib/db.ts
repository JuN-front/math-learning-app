import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface User {
  id: string;
  personal_id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  order: number;
  created_at: string;
}

export interface Content {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  order: number;
  has_video: boolean;
  has_textbook: boolean;
  has_assignment: boolean;
  video_path: string | null;
  textbook_path: string | null;
  assignment_path: string | null;
  answer_path: string | null;
  lock_conditions: string[]; // content IDs that must be completed first
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  content_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  video_watched: boolean;
  textbook_read: boolean;
  assignment_submitted: boolean;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  content_id: string;
  file_path: string;
  filename: string;
  submitted_at: string;
}

export interface DB {
  users: User[];
  units: Unit[];
  contents: Content[];
  progress: Progress[];
  assignments: Assignment[];
}

export function readDB(): DB {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function writeDB(db: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
