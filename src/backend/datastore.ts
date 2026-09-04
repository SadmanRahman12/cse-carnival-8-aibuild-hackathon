import fs from 'fs';
import path from 'path';
import os from 'os';
import { CampusDatabase, Schedule, Room, EventItem, Announcement, Assignment } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusos_db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'campusos_db.json');

let inMemoryDb: CampusDatabase | null = null;

function readJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadSeedData(): CampusDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.schedules && parsed.rooms && parsed.events && parsed.announcements && parsed.assignments) {
        return parsed;
      }
    } catch (err) {
      console.error('Failed reading existing campusos_db.json:', err);
    }
  }

  const schedules: Schedule[] = readJsonFile(path.join(DATA_DIR, 'schedules.json'));
  const rooms: Room[] = readJsonFile(path.join(DATA_DIR, 'rooms.json'));
  const events: EventItem[] = readJsonFile(path.join(DATA_DIR, 'events.json'));
  const announcements: Announcement[] = readJsonFile(path.join(DATA_DIR, 'announcements.json'));
  const assignments: Assignment[] = readJsonFile(path.join(DATA_DIR, 'assignments.json'));

  return {
    schedules,
    rooms,
    events,
    announcements,
    assignments,
  };
}

export function getDatabase(): CampusDatabase {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(data);
      if (inMemoryDb && inMemoryDb.schedules && inMemoryDb.rooms && inMemoryDb.events && inMemoryDb.announcements && inMemoryDb.assignments) {
        return inMemoryDb;
      }
    } catch (err) {
      console.error('Failed reading existing campusos_db.json:', err);
    }
  }

  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      const data = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(data);
      if (inMemoryDb && inMemoryDb.schedules && inMemoryDb.rooms && inMemoryDb.events && inMemoryDb.announcements && inMemoryDb.assignments) {
        return inMemoryDb;
      }
    } catch (err) {
      console.error('Failed reading tmp campusos_db.json:', err);
    }
  }

  // Initialize from seed files
  const seed = loadSeedData();
  saveDatabase(seed);
  inMemoryDb = seed;
  return inMemoryDb;
}

export function saveDatabase(db: CampusDatabase): void {
  inMemoryDb = db;
  
  // Try writing to main project directory first (local dev / persistent server)
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
    return;
  } catch (err) {
    // Read-only filesystem in serverless environments (/var/task)
  }

  // Fallback: try writing to OS temp directory (/tmp)
  try {
    const tempPath = `${TMP_DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, TMP_DB_FILE);
  } catch (err) {
    console.warn('Persistence unavailable. Operating in pure in-memory mode.');
  }
}

export function resetDatabase(): CampusDatabase {
  inMemoryDb = null;
  if (fs.existsSync(TMP_DB_FILE)) {
    try { fs.unlinkSync(TMP_DB_FILE); } catch {}
  }
  const seed = loadSeedData();
  saveDatabase(seed);
  return seed;
}
