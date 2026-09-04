import {
  getAllSchedules,
  getAllRooms,
  searchRooms,
  bookRoom,
  cancelBooking,
  getAllEvents,
  registerEvent,
  cancelRegistration,
  getAllAnnouncements,
  getAllAssignments,
  getFreeTimeActivities,
} from '@/backend/services';
import { ToolCallLog } from '@/backend/types';

export const AGENT_TOOLS_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Get class timetable schedules for university students. Can filter by day (Sunday-Thursday), course code, or room.',
      parameters: {
        type: 'object',
        properties: {
          day: {
            type: 'string',
            description: 'Day of week: "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"',
          },
          course: {
            type: 'string',
            description: 'Course code (e.g. "CSE 4113", "CSE 4173")',
          },
          room: {
            type: 'string',
            description: 'Room number (e.g. "7A03")',
          },
          instructor: {
            type: 'string',
            description: 'Instructor name',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_assignments',
      description: 'Get course assignments with deadlines, status, and submission platforms.',
      parameters: {
        type: 'object',
        properties: {
          course: {
            type: 'string',
            description: 'Course code filter (e.g. "CSE 4113")',
          },
          status: {
            type: 'string',
            enum: ['pending', 'submitted', 'graded', 'late'],
            description: 'Assignment status filter',
          },
          due_before: {
            type: 'string',
            description: 'Filter assignments due on or before date YYYY-MM-DD',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_announcements',
      description: 'Get campus announcements and official notices with priority level and expiration date.',
      parameters: {
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Priority filter',
          },
          active_only: {
            type: 'boolean',
            description: 'If true, returns only non-expired announcements',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rooms',
      description: 'Get campus rooms (classrooms, labs, seminar halls) with capacity and equipment details.',
      parameters: {
        type: 'object',
        properties: {
          floor: {
            type: 'number',
            description: 'Floor number (e.g. 7)',
          },
          type: {
            type: 'string',
            enum: ['classroom', 'lab', 'seminar'],
            description: 'Room type',
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required equipment list (e.g. ["projector", "AC", "whiteboard", "computers"])',
          },
          min_capacity: {
            type: 'number',
            description: 'Minimum seating capacity',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_rooms',
      description: 'Search for campus rooms that match equipment/capacity criteria AND are physically available (not booked and no scheduled classes) on a specific date and time slot.',
      parameters: {
        type: 'object',
        required: ['date', 'start_time', 'end_time'],
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
          start_time: {
            type: 'string',
            description: 'Start time in 24h HH:MM format',
          },
          end_time: {
            type: 'string',
            description: 'End time in 24h HH:MM format',
          },
          capacity: {
            type: 'number',
            description: 'Required seating capacity',
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required equipment items (e.g. ["projector"])',
          },
          type: {
            type: 'string',
            enum: ['classroom', 'lab', 'seminar'],
            description: 'Room type filter',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_room',
      description: 'Book a campus room. Validates 4 gates (room exists, slot is free without schedule/booking conflict, capacity sufficient, equipment present) before committing write.',
      parameters: {
        type: 'object',
        required: ['room_number', 'date', 'start_time', 'end_time', 'booked_by', 'purpose'],
        properties: {
          room_number: {
            type: 'string',
            description: 'Room code (e.g. "7A02", "7B05")',
          },
          date: {
            type: 'string',
            description: 'Booking date in YYYY-MM-DD format',
          },
          start_time: {
            type: 'string',
            description: 'Start time in 24h HH:MM format (e.g. "15:00")',
          },
          end_time: {
            type: 'string',
            description: 'End time in 24h HH:MM format (e.g. "17:00")',
          },
          booked_by: {
            type: 'string',
            description: 'Name of student, faculty, or club booking the room',
          },
          purpose: {
            type: 'string',
            description: 'Purpose for booking (e.g. "Study Session", "Club Meeting")',
          },
          capacity_needed: {
            type: 'number',
            description: 'Party size / capacity needed',
          },
          equipment_needed: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required equipment (e.g. ["projector"])',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_events',
      description: 'Get university events, hackathons, workshops, and guest lectures with venue, capacity, and registration status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['upcoming', 'ongoing', 'completed', 'cancelled', 'full'],
            description: 'Event status filter',
          },
          date: {
            type: 'string',
            description: 'Date filter YYYY-MM-DD',
          },
          venue: {
            type: 'string',
            description: 'Room number venue filter',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_event',
      description: 'Register a student for a campus event. Validates event existence, open status, capacity ceiling, and duplicate registrations before committing write.',
      parameters: {
        type: 'object',
        required: ['student_id', 'student_name'],
        properties: {
          event_id: {
            type: 'string',
            description: 'Event ID (e.g. "evt-002")',
          },
          event_name: {
            type: 'string',
            description: 'Event name or partial title (e.g. "Guest Lecture", "Deep Learning")',
          },
          student_id: {
            type: 'string',
            description: 'Student ID number (e.g. "20-40532")',
          },
          student_name: {
            type: 'string',
            description: 'Student full name',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_booking',
      description: 'Cancel an existing room booking.',
      parameters: {
        type: 'object',
        required: ['room_number', 'booking_id'],
        properties: {
          room_number: {
            type: 'string',
            description: 'Room code (e.g. "7C02")',
          },
          booking_id: {
            type: 'string',
            description: 'Booking ID (e.g. "bk-003")',
          },
          requested_by: {
            type: 'string',
            description: 'Identity of person requesting cancellation',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_registration',
      description: 'Cancel an existing event registration for a student.',
      parameters: {
        type: 'object',
        required: ['student_id'],
        properties: {
          event_id: {
            type: 'string',
            description: 'Event ID (e.g. "evt-002")',
          },
          event_name: {
            type: 'string',
            description: 'Event name or partial title (e.g. "Deep Learning")',
          },
          student_id: {
            type: 'string',
            description: 'Student ID number (e.g. "20-40532")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_free_time_activities',
      description: 'Multi-source query: finds free time slots between classes or up to a specified hour, and cross-references them with campus events and available rooms.',
      parameters: {
        type: 'object',
        properties: {
          day: {
            type: 'string',
            description: 'Day of week (e.g. "Sunday")',
          },
          until_time: {
            type: 'string',
            description: 'Time limit 24h format (e.g. "14:00")',
          },
          current_time: {
            type: 'string',
            description: 'Current or start time 24h format (e.g. "09:00")',
          },
        },
      },
    },
  },
];

// Execute a tool by name with arguments against the live backend services
export async function executeAgentTool(toolName: string, args: Record<string, any>): Promise<ToolCallLog> {
  const timestamp = new Date().toISOString();
  const id = `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    switch (toolName) {
      case 'get_schedule': {
        const result = getAllSchedules({
          day: args.day,
          course: args.course,
          room: args.room,
          instructor: args.instructor,
        });
        return {
          id,
          tool: toolName,
          args,
          result: { count: result.length, schedules: result },
          status: 'success',
          timestamp,
        };
      }

      case 'get_assignments': {
        const result = getAllAssignments({
          course: args.course,
          status: args.status,
          due_before: args.due_before,
        });
        return {
          id,
          tool: toolName,
          args,
          result: { count: result.length, assignments: result },
          status: 'success',
          timestamp,
        };
      }

      case 'get_announcements': {
        const result = getAllAnnouncements({
          priority: args.priority,
          active_only: args.active_only,
        });
        return {
          id,
          tool: toolName,
          args,
          result: { count: result.length, announcements: result },
          status: 'success',
          timestamp,
        };
      }

      case 'get_rooms': {
        const result = getAllRooms({
          floor: args.floor,
          type: args.type,
          equipment: args.equipment,
          min_capacity: args.min_capacity,
        });
        return {
          id,
          tool: toolName,
          args,
          result: { count: result.length, rooms: result },
          status: 'success',
          timestamp,
        };
      }

      case 'search_rooms': {
        const result = searchRooms({
          date: args.date,
          start_time: args.start_time,
          end_time: args.end_time,
          capacity: args.capacity,
          equipment: args.equipment,
          type: args.type,
        });
        return {
          id,
          tool: toolName,
          args,
          result,
          status: 'success',
          timestamp,
        };
      }

      case 'book_room': {
        const result = bookRoom({
          room_number: args.room_number,
          date: args.date,
          start_time: args.start_time,
          end_time: args.end_time,
          booked_by: args.booked_by,
          purpose: args.purpose,
          capacity_needed: args.capacity_needed,
          equipment_needed: args.equipment_needed,
        });
        return {
          id,
          tool: toolName,
          args,
          result,
          status: result.success ? 'success' : 'refused',
          timestamp,
        };
      }

      case 'get_events': {
        const result = getAllEvents({
          status: args.status,
          date: args.date,
          venue: args.venue,
        });
        return {
          id,
          tool: toolName,
          args,
          result: { count: result.length, events: result },
          status: 'success',
          timestamp,
        };
      }

      case 'register_event': {
        const result = registerEvent({
          event_id: args.event_id,
          event_name: args.event_name,
          student_id: args.student_id,
          student_name: args.student_name,
        });
        return {
          id,
          tool: toolName,
          args,
          result,
          status: result.success ? 'success' : 'refused',
          timestamp,
        };
      }

      case 'cancel_booking': {
        const result = cancelBooking(args.room_number, args.booking_id, args.requested_by);
        return {
          id,
          tool: toolName,
          args,
          result,
          status: result.success ? 'success' : 'refused',
          timestamp,
        };
      }

      case 'cancel_registration': {
        const result = cancelRegistration({
          event_id: args.event_id,
          event_name: args.event_name,
          student_id: args.student_id,
        });
        return {
          id,
          tool: toolName,
          args,
          result,
          status: result.success ? 'success' : 'refused',
          timestamp,
        };
      }

      case 'get_free_time_activities': {
        const result = getFreeTimeActivities({
          day: args.day,
          until_time: args.until_time,
          current_time: args.current_time,
        });
        return {
          id,
          tool: toolName,
          args,
          result,
          status: 'success',
          timestamp,
        };
      }

      default:
        return {
          id,
          tool: toolName,
          args,
          result: { error: `Tool '${toolName}' not recognized` },
          status: 'error',
          timestamp,
        };
    }
  } catch (err: any) {
    return {
      id,
      tool: toolName,
      args,
      result: { error: err.message },
      status: 'error',
      timestamp,
    };
  }
}
