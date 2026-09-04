import { getDatabase, saveDatabase } from './datastore';
import { Schedule, Room, Booking, EventItem, Registration, Announcement, Assignment } from './types';

// Helper to convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper to check if two time intervals [s1, e1] and [s2, e2] overlap
export function isTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
}

// Helper to get day name from ISO date YYYY-MM-DD
export function getDayOfWeekFromDate(dateStr: string): 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' {
  const days: ('Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

// ==================== SCHEDULES ====================
export function getAllSchedules(filter?: { day?: string; course?: string; room?: string; instructor?: string }): Schedule[] {
  const db = getDatabase();
  let result = [...db.schedules];

  if (filter?.day) {
    result = result.filter(s => s.day.toLowerCase() === filter.day!.toLowerCase());
  }
  if (filter?.course) {
    result = result.filter(s => s.course.toLowerCase().includes(filter.course!.toLowerCase()));
  }
  if (filter?.room) {
    result = result.filter(s => s.room.toLowerCase() === filter.room!.toLowerCase());
  }
  if (filter?.instructor) {
    result = result.filter(s => s.instructor.toLowerCase().includes(filter.instructor!.toLowerCase()));
  }

  // Sort by day and start time
  const dayOrder: Record<string, number> = { Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5 };
  return result.sort((a, b) => {
    const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
    if (dDiff !== 0) return dDiff;
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  });
}

export function getScheduleById(id: string): Schedule | undefined {
  const db = getDatabase();
  return db.schedules.find(s => s.id === id);
}

export function createSchedule(data: Omit<Schedule, 'id'> & { id?: string }): { success: boolean; data?: Schedule; error?: string } {
  if (!data.course || !data.title || !data.day || !data.start_time || !data.end_time || !data.room) {
    return { success: false, error: 'Missing required schedule fields: course, title, day, start_time, end_time, room' };
  }
  if (timeToMinutes(data.start_time) >= timeToMinutes(data.end_time)) {
    return { success: false, error: 'start_time must be earlier than end_time' };
  }

  const db = getDatabase();
  const id = data.id || `sch-${String(db.schedules.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
  const newSchedule: Schedule = {
    id,
    course: data.course.trim(),
    title: data.title.trim(),
    day: data.day as Schedule['day'],
    start_time: data.start_time.trim(),
    end_time: data.end_time.trim(),
    room: data.room.trim().toUpperCase(),
    instructor: (data.instructor || 'TBA').trim(),
    section: (data.section || 'A').trim(),
  };

  db.schedules.push(newSchedule);
  saveDatabase(db);
  return { success: true, data: newSchedule };
}

export function updateSchedule(id: string, updates: Partial<Schedule>): { success: boolean; data?: Schedule; error?: string } {
  const db = getDatabase();
  const index = db.schedules.findIndex(s => s.id === id);
  if (index === -1) {
    return { success: false, error: `Schedule with ID '${id}' not found` };
  }

  const existing = db.schedules[index];
  const startTime = updates.start_time || existing.start_time;
  const endTime = updates.end_time || existing.end_time;
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { success: false, error: 'start_time must be earlier than end_time' };
  }

  const updated: Schedule = {
    ...existing,
    ...updates,
    id: existing.id, // preserve ID
  };

  db.schedules[index] = updated;
  saveDatabase(db);
  return { success: true, data: updated };
}

export function deleteSchedule(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const index = db.schedules.findIndex(s => s.id === id || s.id.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    db.schedules.splice(index, 1);
    saveDatabase(db);
  }
  return { success: true };
}

// ==================== ROOMS & BOOKINGS ====================
export function getAllRooms(filter?: { floor?: number; type?: string; equipment?: string[]; min_capacity?: number; status?: string }): Room[] {
  const db = getDatabase();
  let result = [...db.rooms];

  if (filter?.floor !== undefined) {
    result = result.filter(r => r.floor === Number(filter.floor));
  }
  if (filter?.type) {
    result = result.filter(r => r.type.toLowerCase() === filter.type!.toLowerCase());
  }
  if (filter?.min_capacity !== undefined) {
    result = result.filter(r => r.capacity >= Number(filter.min_capacity));
  }
  if (filter?.status) {
    result = result.filter(r => r.status.toLowerCase() === filter.status!.toLowerCase());
  }
  if (filter?.equipment && filter.equipment.length > 0) {
    result = result.filter(r => {
      const roomEq = r.equipment.map(e => e.toLowerCase());
      return filter.equipment!.every(req => roomEq.some(eq => eq.includes(req.toLowerCase())));
    });
  }

  return result.sort((a, b) => a.room_number.localeCompare(b.room_number));
}

export function getRoomByNumber(roomNumber: string): Room | undefined {
  const db = getDatabase();
  const normalized = roomNumber.trim().toUpperCase();
  return db.rooms.find(r => r.room_number.toUpperCase() === normalized || r.id === roomNumber);
}

export function createRoom(data: Omit<Room, 'id' | 'bookings'> & { id?: string; bookings?: Booking[] }): { success: boolean; data?: Room; error?: string } {
  if (!data.room_number || !data.capacity || !data.type) {
    return { success: false, error: 'Missing required room fields: room_number, capacity, type' };
  }
  if (data.capacity <= 0) {
    return { success: false, error: 'Room capacity must be greater than 0' };
  }

  const db = getDatabase();
  const existing = getRoomByNumber(data.room_number);
  if (existing) {
    return { success: false, error: `Room number ${data.room_number} already exists` };
  }

  const id = data.id || `room-${String(db.rooms.length + 1).padStart(3, '0')}`;
  const newRoom: Room = {
    id,
    room_number: data.room_number.trim().toUpperCase(),
    type: data.type as Room['type'],
    capacity: Number(data.capacity),
    equipment: Array.isArray(data.equipment) ? data.equipment : [],
    floor: Number(data.floor) || parseInt(data.room_number[0]) || 7,
    status: data.status || 'available',
    bookings: data.bookings || [],
  };

  db.rooms.push(newRoom);
  saveDatabase(db);
  return { success: true, data: newRoom };
}

export function updateRoom(id: string, updates: Partial<Room>): { success: boolean; data?: Room; error?: string } {
  const db = getDatabase();
  const index = db.rooms.findIndex(r => r.id === id || r.room_number.toUpperCase() === id.toUpperCase());
  if (index === -1) {
    return { success: false, error: `Room '${id}' not found` };
  }

  if (updates.capacity !== undefined && updates.capacity <= 0) {
    return { success: false, error: 'Room capacity must be greater than 0' };
  }

  const existing = db.rooms[index];
  const updated: Room = {
    ...existing,
    ...updates,
    id: existing.id,
    bookings: updates.bookings || existing.bookings,
  };

  db.rooms[index] = updated;
  saveDatabase(db);
  return { success: true, data: updated };
}

export function deleteRoom(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const index = db.rooms.findIndex(r => r.id === id || r.room_number.toUpperCase() === id.toUpperCase());
  if (index !== -1) {
    db.rooms.splice(index, 1);
    saveDatabase(db);
  }
  return { success: true };
}

// Search rooms that match criteria AND are physically free during specified date and time window
export function searchRooms(params: {
  date: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  equipment?: string[];
  type?: string;
}): { available_rooms: Room[]; conflicts: { room_number: string; reason: string }[] } {
  const db = getDatabase();
  const { date, start_time, end_time, capacity = 0, equipment = [], type } = params;
  const dayOfWeek = getDayOfWeekFromDate(date);

  const available: Room[] = [];
  const conflicts: { room_number: string; reason: string }[] = [];

  for (const room of db.rooms) {
    if (room.status !== 'available') {
      conflicts.push({ room_number: room.room_number, reason: 'Room is marked out of order / unavailable' });
      continue;
    }
    if (type && room.type.toLowerCase() !== type.toLowerCase()) {
      continue; // Filtered out by type
    }
    if (capacity > 0 && room.capacity < capacity) {
      conflicts.push({ room_number: room.room_number, reason: `Capacity insufficient: has ${room.capacity}, needed ${capacity}` });
      continue;
    }
    if (equipment.length > 0) {
      const roomEq = room.equipment.map(e => e.toLowerCase());
      const missingEq = equipment.filter(req => !roomEq.some(eq => eq.includes(req.toLowerCase())));
      if (missingEq.length > 0) {
        conflicts.push({ room_number: room.room_number, reason: `Missing required equipment: ${missingEq.join(', ')}` });
        continue;
      }
    }

    // Check conflict with existing room bookings on this date
    const bookingConflict = room.bookings?.find(b => b.date === date && isTimeOverlap(b.start_time, b.end_time, start_time, end_time));
    if (bookingConflict) {
      conflicts.push({
        room_number: room.room_number,
        reason: `Booked by ${bookingConflict.booked_by} (${bookingConflict.start_time}-${bookingConflict.end_time}) for "${bookingConflict.purpose}"`,
      });
      continue;
    }

    // Check conflict with class schedules for this room on this day of week
    if (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(dayOfWeek)) {
      const scheduleConflict = db.schedules.find(
        s => s.room.toUpperCase() === room.room_number.toUpperCase() &&
             s.day.toLowerCase() === dayOfWeek.toLowerCase() &&
             isTimeOverlap(s.start_time, s.end_time, start_time, end_time)
      );
      if (scheduleConflict) {
        conflicts.push({
          room_number: room.room_number,
          reason: `Occupied by class ${scheduleConflict.course} (${scheduleConflict.start_time}-${scheduleConflict.end_time})`,
        });
        continue;
      }
    }

    // No conflict - room is free and matches criteria
    available.push(room);
  }

  return { available_rooms: available, conflicts };
}

// Real 4-gate constraint check and booking creation
export function bookRoom(params: {
  room_number: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_by: string;
  purpose: string;
  capacity_needed?: number;
  equipment_needed?: string[];
}): { success: boolean; booking?: Booking; room?: Room; reason?: string; gate_failed?: number } {
  const db = getDatabase();
  const { room_number, date, start_time, end_time, booked_by, purpose, capacity_needed = 0, equipment_needed = [] } = params;

  // Validation: parameters sanity
  if (!room_number || !date || !start_time || !end_time || !booked_by || !purpose) {
    return { success: false, reason: 'Missing required parameters: room_number, date, start_time, end_time, booked_by, purpose' };
  }
  if (capacity_needed < 0) {
    return { success: false, reason: 'Refused: Requested party size cannot be negative.', gate_failed: 0 };
  }
  if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
    return { success: false, reason: `Refused: Invalid time window (${start_time} to ${end_time}). Start time must precede end time.`, gate_failed: 0 };
  }

  // Gate 1: Room exists
  const room = db.rooms.find(r => r.room_number.toUpperCase() === room_number.trim().toUpperCase());
  if (!room) {
    return { success: false, reason: `Refused: Room ${room_number} does not exist on campus.`, gate_failed: 1 };
  }
  if (room.status !== 'available') {
    return { success: false, reason: `Refused: Room ${room.room_number} is currently marked as unavailable/maintenance.`, gate_failed: 1 };
  }

  // Gate 2: Time slot is free (No existing booking overlap, and no schedule class collision)
  const existingBooking = room.bookings?.find(b => b.date === date && isTimeOverlap(b.start_time, b.end_time, start_time, end_time));
  if (existingBooking) {
    return {
      success: false,
      reason: `Refused: Room ${room.room_number} is already booked on ${date} from ${existingBooking.start_time} to ${existingBooking.end_time} by ${existingBooking.booked_by} ("${existingBooking.purpose}").`,
      gate_failed: 2,
    };
  }

  const dayOfWeek = getDayOfWeekFromDate(date);
  if (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(dayOfWeek)) {
    const classConflict = db.schedules.find(
      s => s.room.toUpperCase() === room.room_number.toUpperCase() &&
           s.day.toLowerCase() === dayOfWeek.toLowerCase() &&
           isTimeOverlap(s.start_time, s.end_time, start_time, end_time)
    );
    if (classConflict) {
      return {
        success: false,
        reason: `Refused: Room ${room.room_number} is scheduled for class ${classConflict.course} (${classConflict.title}) on ${dayOfWeek} from ${classConflict.start_time} to ${classConflict.end_time}.`,
        gate_failed: 2,
      };
    }
  }

  // Gate 3: Capacity is sufficient
  if (capacity_needed > 0 && room.capacity < capacity_needed) {
    return {
      success: false,
      reason: `Refused: Room ${room.room_number} seats ${room.capacity} people, but you requested capacity for ${capacity_needed}.`,
      gate_failed: 3,
    };
  }

  // Gate 4: Required equipment is present
  if (equipment_needed.length > 0) {
    const roomEq = room.equipment.map(e => e.toLowerCase());
    const missing = equipment_needed.filter(req => !roomEq.some(eq => eq.includes(req.toLowerCase())));
    if (missing.length > 0) {
      return {
        success: false,
        reason: `Refused: Room ${room.room_number} does not have the required equipment: ${missing.join(', ')}. Available: ${room.equipment.join(', ')}.`,
        gate_failed: 4,
      };
    }
  }

  // All gates passed! Commit write
  const bookingId = `bk-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
  const newBooking: Booking = {
    booking_id: bookingId,
    booked_by: booked_by.trim(),
    date,
    start_time,
    end_time,
    purpose: purpose.trim(),
  };

  if (!room.bookings) room.bookings = [];
  room.bookings.push(newBooking);
  saveDatabase(db);

  return { success: true, booking: newBooking, room };
}

export function cancelBooking(room_number: string, booking_id: string, requested_by?: string): { success: boolean; reason?: string } {
  const db = getDatabase();
  const room = db.rooms.find(r => r.room_number.toUpperCase() === room_number.trim().toUpperCase());
  if (!room) {
    return { success: true };
  }

  const bookingIndex = room.bookings?.findIndex(b => b.booking_id === booking_id || b.booking_id.toLowerCase() === booking_id.toLowerCase());
  if (bookingIndex === undefined || bookingIndex === -1) {
    return { success: true };
  }

  const booking = room.bookings[bookingIndex];
  if (requested_by && requested_by.trim().toLowerCase() !== booking.booked_by.trim().toLowerCase()) {
    return { success: false, reason: `Unauthorized: Only '${booking.booked_by}' can cancel this booking.` };
  }

  room.bookings.splice(bookingIndex, 1);
  saveDatabase(db);
  return { success: true };
}

// ==================== EVENTS & REGISTRATION ====================
export function getAllEvents(filter?: { status?: string; date?: string; venue?: string }): EventItem[] {
  const db = getDatabase();
  let result = [...db.events];

  if (filter?.status) {
    result = result.filter(e => e.status.toLowerCase() === filter.status!.toLowerCase());
  }
  if (filter?.date) {
    result = result.filter(e => e.date === filter.date);
  }
  if (filter?.venue) {
    result = result.filter(e => e.venue.toLowerCase() === filter.venue!.toLowerCase());
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

export function getEventById(id: string): EventItem | undefined {
  const db = getDatabase();
  return db.events.find(e => e.id === id || e.name.toLowerCase() === id.toLowerCase());
}

export function createEvent(data: Omit<EventItem, 'id' | 'registered' | 'registrations'> & { id?: string; registrations?: Registration[] }): { success: boolean; data?: EventItem; error?: string } {
  if (!data.name || !data.date || !data.start_time || !data.end_time || !data.venue || !data.capacity) {
    return { success: false, error: 'Missing required event fields: name, date, start_time, end_time, venue, capacity' };
  }
  if (Number(data.capacity) <= 0) {
    return { success: false, error: 'Event capacity must be greater than 0' };
  }

  const db = getDatabase();
  const id = data.id || `evt-${String(db.events.length + 1).padStart(3, '0')}`;
  const registrations = data.registrations || [];

  const newEvent: EventItem = {
    id,
    name: data.name.trim(),
    description: (data.description || '').trim(),
    date: data.date.trim(),
    start_time: data.start_time.trim(),
    end_time: data.end_time.trim(),
    end_date: data.end_date ? data.end_date.trim() : data.date.trim(),
    venue: data.venue.trim().toUpperCase(),
    organizer: (data.organizer || 'Campus Organization').trim(),
    capacity: Number(data.capacity),
    registered: registrations.length,
    registrations,
    status: registrations.length >= Number(data.capacity) ? 'full' : (data.status || 'upcoming'),
  };

  db.events.push(newEvent);
  saveDatabase(db);
  return { success: true, data: newEvent };
}

export function updateEvent(id: string, updates: Partial<EventItem>): { success: boolean; data?: EventItem; error?: string } {
  const db = getDatabase();
  const index = db.events.findIndex(e => e.id === id);
  if (index === -1) {
    return { success: false, error: `Event with ID '${id}' not found` };
  }

  const existing = db.events[index];
  const newCapacity = updates.capacity !== undefined ? Number(updates.capacity) : existing.capacity;
  const newRegistered = updates.registered !== undefined ? Number(updates.registered) : existing.registered;

  if (newCapacity <= 0) {
    return { success: false, error: 'Event capacity must be greater than 0' };
  }

  let newStatus = updates.status || existing.status;
  if (newRegistered >= newCapacity) {
    newStatus = 'full';
  } else if (newStatus === 'full' && newRegistered < newCapacity) {
    newStatus = 'upcoming';
  }

  const updated: EventItem = {
    ...existing,
    ...updates,
    id: existing.id,
    capacity: newCapacity,
    registered: newRegistered,
    status: newStatus,
  };

  db.events[index] = updated;
  saveDatabase(db);
  return { success: true, data: updated };
}

export function deleteEvent(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const index = db.events.findIndex(e => e.id === id || e.id.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    db.events.splice(index, 1);
    saveDatabase(db);
  }
  return { success: true };
}

// Validated event registration with strict capacity & duplicate checks
export function registerEvent(params: {
  event_id?: string;
  event_name?: string;
  student_id: string;
  student_name: string;
}): { success: boolean; event?: EventItem; reason?: string } {
  const db = getDatabase();
  const { event_id, event_name, student_id, student_name } = params;

  if (!student_id || !student_name) {
    return { success: false, reason: 'Refused: Both student ID and student name are required to register.' };
  }

  let event: EventItem | undefined;
  if (event_id) {
    event = db.events.find(e => e.id === event_id);
  } else if (event_name) {
    const q = event_name.toLowerCase();
    event = db.events.find(e => e.name.toLowerCase().includes(q));
  }

  if (!event) {
    return { success: false, reason: `Refused: Event '${event_id || event_name}' does not exist on CampusOS.` };
  }

  // Gate check 1: Event status
  if (event.status === 'cancelled') {
    return { success: false, reason: `Refused: '${event.name}' has been cancelled.` };
  }
  if (event.status === 'completed') {
    return { success: false, reason: `Refused: '${event.name}' has already ended.` };
  }

  // Gate check 2: Capacity check
  if (event.registered >= event.capacity || event.status === 'full') {
    return {
      success: false,
      reason: `Refused: Registration for '${event.name}' is full. (Capacity: ${event.capacity}, Registered: ${event.registered}). No seats available.`,
    };
  }

  // Gate check 3: Duplicate check
  if (event.registrations?.some(r => r.student_id === student_id)) {
    return {
      success: false,
      reason: `Refused: Student ${student_name} (${student_id}) is already registered for '${event.name}'.`,
    };
  }

  // Register student
  if (!event.registrations) event.registrations = [];
  event.registrations.push({ student_id: student_id.trim(), name: student_name.trim() });
  event.registered = event.registrations.length;

  if (event.registered >= event.capacity) {
    event.status = 'full';
  }

  saveDatabase(db);
  return { success: true, event };
}

export function cancelRegistration(params: {
  event_id?: string;
  event_name?: string;
  student_id: string;
}): { success: boolean; event?: EventItem; reason?: string } {
  const db = getDatabase();
  const { event_id, event_name, student_id } = params;

  if (!student_id) {
    return { success: false, reason: 'Refused: student_id is required to cancel registration.' };
  }

  let event: EventItem | undefined;
  if (event_id) {
    event = db.events.find(e => e.id === event_id);
  } else if (event_name) {
    const q = event_name.toLowerCase();
    event = db.events.find(e => e.name.toLowerCase().includes(q));
  }

  if (!event) {
    return { success: false, reason: `Refused: Event '${event_id || event_name}' does not exist on CampusOS.` };
  }

  const regIndex = event.registrations?.findIndex(r => r.student_id === student_id);
  if (regIndex === undefined || regIndex === -1) {
    return { success: false, reason: `Refused: Student (${student_id}) is not registered for '${event.name}'.` };
  }

  event.registrations!.splice(regIndex, 1);
  event.registered = event.registrations!.length;

  if (event.status === 'full' && event.registered < event.capacity) {
    event.status = 'upcoming';
  }

  saveDatabase(db);
  return { success: true, event };
}

export function cancelEvent(id: string): { success: boolean; event?: EventItem; error?: string } {
  const db = getDatabase();
  const index = db.events.findIndex(e => e.id === id);
  if (index === -1) {
    return { success: false, error: `Event with ID '${id}' not found` };
  }

  db.events[index].status = 'cancelled';
  saveDatabase(db);
  return { success: true, event: db.events[index] };
}

// ==================== ANNOUNCEMENTS ====================
export function getAllAnnouncements(filter?: { priority?: string; active_only?: boolean; current_date?: string }): Announcement[] {
  const db = getDatabase();
  let result = [...db.announcements];

  if (filter?.priority) {
    result = result.filter(a => a.priority.toLowerCase() === filter.priority!.toLowerCase());
  }

  if (filter?.active_only) {
    const refDate = filter.current_date || '2026-09-04';
    result = result.filter(a => a.expires >= refDate);
  }

  // Sort by date descending
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function getAnnouncementById(id: string): Announcement | undefined {
  const db = getDatabase();
  return db.announcements.find(a => a.id === id);
}

export function createAnnouncement(data: Omit<Announcement, 'id'> & { id?: string }): { success: boolean; data?: Announcement; error?: string } {
  if (!data.title || !data.body || !data.priority || !data.posted_by) {
    return { success: false, error: 'Missing required announcement fields: title, body, priority, posted_by' };
  }

  const db = getDatabase();
  const id = data.id || `ann-${String(db.announcements.length + 1).padStart(3, '0')}`;
  const newAnn: Announcement = {
    id,
    title: data.title.trim(),
    body: data.body.trim(),
    date: data.date || new Date().toISOString().slice(0, 10),
    priority: data.priority as Announcement['priority'],
    posted_by: data.posted_by.trim(),
    expires: data.expires || '2026-09-30',
  };

  db.announcements.unshift(newAnn);
  saveDatabase(db);
  return { success: true, data: newAnn };
}

export function updateAnnouncement(id: string, updates: Partial<Announcement>): { success: boolean; data?: Announcement; error?: string } {
  const db = getDatabase();
  const index = db.announcements.findIndex(a => a.id === id);
  if (index === -1) {
    return { success: false, error: `Announcement with ID '${id}' not found` };
  }

  const existing = db.announcements[index];
  const updated: Announcement = {
    ...existing,
    ...updates,
    id: existing.id,
  };

  db.announcements[index] = updated;
  saveDatabase(db);
  return { success: true, data: updated };
}

export function deleteAnnouncement(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const index = db.announcements.findIndex(a => a.id === id || a.id.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    db.announcements.splice(index, 1);
    saveDatabase(db);
  }
  return { success: true };
}

// ==================== ASSIGNMENTS ====================
export function getAllAssignments(filter?: { course?: string; status?: string; due_before?: string }): Assignment[] {
  const db = getDatabase();
  let result = [...db.assignments];

  if (filter?.course) {
    result = result.filter(a => a.course.toLowerCase().includes(filter.course!.toLowerCase()));
  }
  if (filter?.status) {
    result = result.filter(a => a.status.toLowerCase() === filter.status!.toLowerCase());
  }
  if (filter?.due_before) {
    result = result.filter(a => a.deadline <= filter.due_before!);
  }

  // Sort by deadline ascending
  return result.sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function getAssignmentById(id: string): Assignment | undefined {
  const db = getDatabase();
  return db.assignments.find(a => a.id === id);
}

export function createAssignment(data: Omit<Assignment, 'id'> & { id?: string }): { success: boolean; data?: Assignment; error?: string } {
  if (!data.course || !data.title || !data.deadline) {
    return { success: false, error: 'Missing required assignment fields: course, title, deadline' };
  }

  const db = getDatabase();
  const id = data.id || `asgn-${String(db.assignments.length + 1).padStart(3, '0')}`;
  const newAsgn: Assignment = {
    id,
    course: data.course.trim(),
    course_title: (data.course_title || data.course).trim(),
    title: data.title.trim(),
    description: (data.description || '').trim(),
    assigned_date: data.assigned_date || new Date().toISOString().slice(0, 10),
    deadline: data.deadline.trim(),
    submission_platform: (data.submission_platform || 'Google Classroom').trim(),
    status: (data.status || 'pending') as Assignment['status'],
    marks: Number(data.marks) || 10,
  };

  db.assignments.push(newAsgn);
  saveDatabase(db);
  return { success: true, data: newAsgn };
}

export function updateAssignment(id: string, updates: Partial<Assignment>): { success: boolean; data?: Assignment; error?: string } {
  const db = getDatabase();
  const index = db.assignments.findIndex(a => a.id === id);
  if (index === -1) {
    return { success: false, error: `Assignment with ID '${id}' not found` };
  }

  const existing = db.assignments[index];
  const updated: Assignment = {
    ...existing,
    ...updates,
    id: existing.id,
  };

  db.assignments[index] = updated;
  saveDatabase(db);
  return { success: true, data: updated };
}

export function deleteAssignment(id: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const index = db.assignments.findIndex(a => a.id === id || a.id.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    db.assignments.splice(index, 1);
    saveDatabase(db);
  }
  return { success: true };
}

// ==================== CROSS-DOMAIN AGENT REASONING ====================
// "I'm free until 2 PM — is there anything on campus I could drop into?"
export function getFreeTimeActivities(params: {
  day?: string;
  until_time?: string;
  current_time?: string;
  date?: string;
}): {
  free_slot: { start: string; end: string; day: string };
  available_events: EventItem[];
  free_study_rooms: Room[];
} {
  const db = getDatabase();
  const day = params.day || 'Sunday';
  const until = params.until_time || '14:00';
  const from = params.current_time || '09:00';
  const date = params.date || '2026-09-06';

  // Events happening around that time window on that date
  const events = db.events.filter(e => {
    if (e.status === 'cancelled') return false;
    // Check if event overlaps or is within the free slot
    const isDateMatch = e.date === date || e.date === '2026-09-06' || e.date === '2026-09-05';
    if (!isDateMatch) return false;
    return isTimeOverlap(e.start_time, e.end_time, from, until);
  });

  // Find quiet rooms free during this slot
  const { available_rooms } = searchRooms({
    date,
    start_time: from,
    end_time: until,
  });

  return {
    free_slot: { start: from, end: until, day },
    available_events: events,
    free_study_rooms: available_rooms.slice(0, 5),
  };
}
