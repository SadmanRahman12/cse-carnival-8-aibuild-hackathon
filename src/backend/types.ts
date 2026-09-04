export interface Schedule {
  id: string;
  course: string;
  title: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
}

export interface Booking {
  booking_id: string;
  booked_by: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  purpose: string;
}

export interface Room {
  id: string;
  room_number: string;
  type: 'classroom' | 'lab' | 'seminar';
  capacity: number;
  equipment: string[];
  floor: number;
  status: 'available' | 'unavailable';
  bookings: Booking[];
}

export interface Registration {
  student_id: string;
  name: string;
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  end_date: string; // YYYY-MM-DD
  venue: string; // room number
  organizer: string;
  capacity: number;
  registered: number;
  registrations: Registration[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'full';
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  posted_by: string;
  expires: string; // YYYY-MM-DD
}

export interface Assignment {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  submission_platform: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  marks: number;
}

export interface CampusDatabase {
  schedules: Schedule[];
  rooms: Room[];
  events: EventItem[];
  announcements: Announcement[];
  assignments: Assignment[];
}

export interface ToolCallLog {
  id: string;
  tool: string;
  args: Record<string, any>;
  result: any;
  status: 'success' | 'refused' | 'error';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallLog[];
  clarificationNeeded?: boolean;
  refusalReason?: string;
  timestamp: string;
}
