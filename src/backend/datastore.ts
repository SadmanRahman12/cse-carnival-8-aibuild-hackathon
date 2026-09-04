import fs from 'fs';
import path from 'path';
import { CampusDatabase, Schedule, Room, EventItem, Announcement, Assignment } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusos_db.json');

let inMemoryDb: CampusDatabase | null = null;

function readJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadSeedData(): CampusDatabase {
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

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(data);
      if (inMemoryDb && inMemoryDb.schedules && inMemoryDb.rooms && inMemoryDb.events && inMemoryDb.announcements && inMemoryDb.assignments) {
        return inMemoryDb;
      }
    } catch (err) {
      console.error('Failed reading existing campusos_db.json, re-initializing from seeds:', err);
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
  const tempPath = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  } catch {
    // Direct write fallback
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }
}

export function resetDatabase(): CampusDatabase {
  const seed = loadSeedData();
  saveDatabase(seed);
  return seed;
}
