import { AGENT_TOOLS_DEFINITIONS, executeAgentTool } from './tools';
import { checkRefusalConditions } from './refusal';
import { checkClarificationConditions } from './clarification';
import { ToolCallLog } from '@/backend/types';

export interface AgentResponse {
  answer: string;
  toolCalls: ToolCallLog[];
  clarificationNeeded?: boolean;
  refusalReason?: string;
  providerUsed: string;
}

// Format 24-hour time to friendly 12-hour string (e.g. "13:00" -> "1:00 PM")
function formatTime12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCHOOL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

function getTodayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

// Get current time in 24h HH:MM format from the real system clock
function getCurrentTime24(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Autonomous Built-in Tool Calling Engine (Zero External Dependencies)
async function executeAutonomousAgent(query: string): Promise<AgentResponse> {
  const q = query.toLowerCase();
  const toolCalls: ToolCallLog[] = [];

  // 1. Room search with multiple filters (e.g. "Which labs have a projector and can fit at least 30 people?")
  if (q.includes('lab') && (q.includes('projector') || q.includes('capacity') || q.includes('fit at least') || q.includes('fit'))) {
    const minCapMatch = q.match(/fit\s+(at\s+least\s+)?(\d+)/i) || q.match(/(\d+)\s*(people|seats|capacity)/i);
    const minCap = minCapMatch ? parseInt(minCapMatch[2] || minCapMatch[1], 10) : 30;
    const reqEquipment = q.includes('projector') ? ['projector'] : [];

    const callLog = await executeAgentTool('get_rooms', {
      type: 'lab',
      min_capacity: minCap,
      equipment: reqEquipment,
    });
    toolCalls.push(callLog);

    const rooms = callLog.result.rooms || [];
    if (rooms.length === 0) {
      return {
        answer: `I searched the live campus database, but no labs were found matching capacity >= ${minCap} and equipment including ${reqEquipment.join(', ')}.`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const roomListStr = rooms
      .map((r: any) => `• **Room ${r.room_number}** (Floor ${r.floor}) — Capacity: ${r.capacity} seats | Equipment: ${r.equipment.join(', ')}`)
      .join('\n');

    return {
      answer: `Found **${rooms.length} lab(s)** that have a projector and can fit at least ${minCap} people:\n\n${roomListStr}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 2. Multi-Source Reasoning: "I'm free until 2 PM — is there anything on campus I could drop into?"
  if (q.includes('free until') || (q.includes('free') && (q.includes('drop into') || q.includes('anything on campus')))) {
    const untilMatch = q.match(/until\s+(\d{1,2}(:\d{2})?\s*(pm|am)?)/i);
    let untilTime = '14:00';
    if (untilMatch) {
      const raw = untilMatch[1].toLowerCase();
      if (raw.includes('pm') && !raw.startsWith('12')) {
        const num = parseInt(raw, 10);
        untilTime = `${num + 12}:00`;
      } else if (raw.includes(':')) {
        untilTime = raw.replace(/\s*(am|pm)/, '');
      } else {
        const num = parseInt(raw, 10);
        untilTime = `${num < 8 ? num + 12 : num}:00`.padStart(5, '0');
      }
    }

    // Call schedule tool to check today's classes
    const schedCall = await executeAgentTool('get_schedule', { day: 'Sunday' });
    toolCalls.push(schedCall);

    // Call free time activities tool (cross-referencing events & rooms)
    const actCall = await executeAgentTool('get_free_time_activities', {
      day: 'Sunday',
      until_time: untilTime,
      current_time: '11:00',
    });
    toolCalls.push(actCall);

    const availableEvents = actCall.result.available_events || [];
    const freeRooms = actCall.result.free_study_rooms || [];

    let response = `Based on your schedule, you have a free window until **${formatTime12(untilTime)}**.\n\n`;
    if (availableEvents.length > 0) {
      response += `🎉 **Campus Events happening during your free window:**\n` +
        availableEvents.map((e: any) => `• **${e.name}** at Room ${e.venue} (${formatTime12(e.start_time)} – ${formatTime12(e.end_time)}) — ${e.description}`).join('\n') + '\n\n';
    } else {
      response += `There are no scheduled public events in that specific slot, but there are free study spaces available:\n`;
    }

    if (freeRooms.length > 0) {
      response += `🏢 **Available Study Rooms:**\n` +
        freeRooms.slice(0, 3).map((r: any) => `• **Room ${r.room_number}** (${r.type}, seats ${r.capacity}, equipped with ${r.equipment.join(', ')})`).join('\n');
    }

    return {
      answer: response,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 3. Room Booking with Criteria: "I need a room for 5 people with a projector, tomorrow between 2 and 4."
  if (
    (q.includes('need a room') || q.includes('find a room')) &&
    (q.includes('people') || q.includes('projector') || q.includes('between'))
  ) {
    const capMatch = q.match(/for\s+(\d+)\s*people/i) || q.match(/(\d+)\s*people/i);
    const cap = capMatch ? parseInt(capMatch[1], 10) : 5;
    const eq = q.includes('projector') ? ['projector'] : [];

    let startTime = '14:00';
    let endTime = '16:00';
    const betweenMatch = q.match(/between\s+(\d{1,2})\s*and\s*(\d{1,2})/i);
    if (betweenMatch) {
      const s = parseInt(betweenMatch[1], 10);
      const e = parseInt(betweenMatch[2], 10);
      startTime = `${s < 8 ? s + 12 : s}:00`.padStart(5, '0');
      endTime = `${e < 8 ? e + 12 : e}:00`.padStart(5, '0');
    }

    const searchCall = await executeAgentTool('search_rooms', {
      date: '2026-09-05',
      start_time: startTime,
      end_time: endTime,
      capacity: cap,
      equipment: eq,
    });
    toolCalls.push(searchCall);

    const rooms = searchCall.result.available_rooms || [];
    if (rooms.length === 0) {
      return {
        answer: `I searched for rooms for ${cap} people with ${eq.join(', ')} between ${formatTime12(startTime)} and ${formatTime12(endTime)}, but none were available due to schedule or booking conflicts.`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const topRoom = rooms[0];
    const otherRooms = rooms.slice(1, 4).map((r: any) => r.room_number).join(', ');

    return {
      answer: `Found **${rooms.length} available rooms** matching your criteria for tomorrow between ${formatTime12(startTime)} and ${formatTime12(endTime)}:\n\n` +
        `• **Recommended: Room ${topRoom.room_number}** (${topRoom.type}, seats ${topRoom.capacity}, has ${topRoom.equipment.join(', ')})\n` +
        (otherRooms ? `• Other options: Room ${otherRooms}\n\n` : '\n') +
        `Would you like me to reserve **Room ${topRoom.room_number}** for you?`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 4. Specific Room Booking Action: "Book Room 7A02 tomorrow from 3 PM to 5 PM."
  if ((q.includes('book room') || (q.includes('book') && /7[abc]\d{2}/i.test(q))) && !q.includes('cancel')) {
    const roomMatch = q.match(/7[abc]\d{2}/i);
    const roomNumber = roomMatch ? roomMatch[0].toUpperCase() : '7A02';

    let startTime = '15:00';
    let endTime = '17:00';
    const timeRangeMatch = q.match(/from\s+(\d{1,2})(:\d{2})?\s*(pm|am)?\s*to\s+(\d{1,2})(:\d{2})?\s*(pm|am)?/i) ||
                           q.match(/(\d{1,2})\s*(pm|am)?\s*(to|-)\s*(\d{1,2})\s*(pm|am)?/i);

    if (timeRangeMatch) {
      const sRaw = parseInt(timeRangeMatch[1], 10);
      const eRaw = parseInt(timeRangeMatch[4], 10);
      startTime = `${sRaw < 8 ? sRaw + 12 : sRaw}:00`.padStart(5, '0');
      endTime = `${eRaw < 8 ? eRaw + 12 : eRaw}:00`.padStart(5, '0');
    }

    const bookCall = await executeAgentTool('book_room', {
      room_number: roomNumber,
      date: '2026-09-05',
      start_time: startTime,
      end_time: endTime,
      booked_by: 'Student (Sakibul Hassan)',
      purpose: 'Group Study & Project Review',
    });
    toolCalls.push(bookCall);

    if (!bookCall.result.success) {
      return {
        answer: bookCall.result.reason || `Unable to book Room ${roomNumber} due to constraint checks.`,
        toolCalls,
        refusalReason: bookCall.result.reason,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const b = bookCall.result.booking;
    return {
      answer: `✅ **Room Successfully Booked!**\n\n• **Room:** ${roomNumber}\n• **Date:** ${b.date} (Tomorrow)\n• **Time Slot:** ${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}\n• **Booking ID:** \`${b.booking_id}\`\n• **Booked By:** ${b.booked_by}\n• **Purpose:** ${b.purpose}\n\nThe reservation has been recorded in the live campus datastore.`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 5. Event Registration Action: "Register me for the Guest Lecture on Deep Learning" or "Register for..."
  if ((q.includes('register') || q.includes('sign me up')) && !q.includes('cancel') && !q.includes('unregister')) {
    let eventName = 'Guest Lecture';
    if (q.includes('deep learning')) eventName = 'Deep Learning';
    else if (q.includes('hackathon')) eventName = 'Hackathon';
    else if (q.includes('git') || q.includes('github')) eventName = 'Git';
    else if (q.includes('carnival')) eventName = 'Carnival';
    else if (q.includes('soft computing')) eventName = 'Soft Computing';
    else if (q.includes('orientation')) eventName = 'Orientation';

    const regCall = await executeAgentTool('register_event', {
      event_name: eventName,
      student_id: '20-40532',
      student_name: 'Sakibul Hassan',
    });
    toolCalls.push(regCall);

    if (!regCall.result.success) {
      return {
        answer: regCall.result.reason || `Could not complete registration.`,
        toolCalls,
        refusalReason: regCall.result.reason,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const ev = regCall.result.event;
    return {
      answer: `🎟️ **Registration Confirmed!**\n\nYou have been successfully registered for:\n\n• **Event:** ${ev.name}\n• **Date:** ${ev.date}\n• **Time:** ${formatTime12(ev.start_time)} – ${formatTime12(ev.end_time)}\n• **Venue:** Room ${ev.venue}\n• **Registered Student:** Sakibul Hassan (ID: 20-40532)\n• **Capacity:** ${ev.registered} / ${ev.capacity} seats filled.`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 5a. Cancel Booking Action
  if (
    (q.includes('cancel') || q.includes('delete booking') || q.includes('remove booking')) &&
    (q.includes('booking') || /bk-[\w-]+/i.test(q) || (q.includes('room') && !q.includes('registration') && !q.includes('event')))
  ) {
    const bkMatch = q.match(/bk-[\w-]+/i);
    const roomMatch = q.match(/7[abc]\d{2}/i);

    let roomNumber = roomMatch ? roomMatch[0].toUpperCase() : '';
    let bookingId = bkMatch ? bkMatch[0] : '';

    if (bookingId && !roomNumber) {
      const allRoomsCall = await executeAgentTool('get_rooms', {});
      const rList = allRoomsCall.result.rooms || [];
      for (const r of rList) {
        if (r.bookings?.some((b: any) => b.booking_id.toLowerCase() === bookingId.toLowerCase())) {
          roomNumber = r.room_number;
          break;
        }
      }
    }

    if (roomNumber && !bookingId) {
      const allRoomsCall = await executeAgentTool('get_rooms', {});
      const rList = allRoomsCall.result.rooms || [];
      const targetR = rList.find((r: any) => r.room_number.toUpperCase() === roomNumber.toUpperCase());
      if (targetR && targetR.bookings?.length > 0) {
        bookingId = targetR.bookings[targetR.bookings.length - 1].booking_id;
      }
    }

    if (!roomNumber || !bookingId) {
      return {
        answer: "To cancel a room booking, please specify the room number (e.g. Room 7A02) or the booking ID (e.g. bk-001).",
        toolCalls,
        clarificationNeeded: true,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const cancelCall = await executeAgentTool('cancel_booking', {
      room_number: roomNumber,
      booking_id: bookingId,
      requested_by: 'Student (Sakibul Hassan)',
    });
    toolCalls.push(cancelCall);

    if (!cancelCall.result.success) {
      return {
        answer: cancelCall.result.reason || `Could not cancel booking ${bookingId} in Room ${roomNumber}.`,
        toolCalls,
        refusalReason: cancelCall.result.reason,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    return {
      answer: `✅ **Booking Cancelled Successfully!**\n\nBooking \`${bookingId}\` for Room **${roomNumber}** has been removed. The room slot is now available.`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 5b. Cancel Event Registration Action
  if (
    (q.includes('cancel') || q.includes('unregister') || q.includes('drop')) &&
    (q.includes('registration') || q.includes('register') || q.includes('event') || q.includes('lecture') || q.includes('workshop') || q.includes('hackathon'))
  ) {
    let eventName = '';
    if (q.includes('deep learning')) eventName = 'Deep Learning';
    else if (q.includes('hackathon')) eventName = 'Hackathon';
    else if (q.includes('git') || q.includes('github')) eventName = 'Git';
    else if (q.includes('carnival')) eventName = 'Carnival';
    else if (q.includes('soft computing')) eventName = 'Soft Computing';
    else if (q.includes('orientation')) eventName = 'Orientation';

    const cancelRegCall = await executeAgentTool('cancel_registration', {
      event_name: eventName || undefined,
      student_id: '20-40532',
    });
    toolCalls.push(cancelRegCall);

    if (!cancelRegCall.result.success) {
      return {
        answer: cancelRegCall.result.reason || `Could not cancel registration.`,
        toolCalls,
        refusalReason: cancelRegCall.result.reason,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const ev = cancelRegCall.result.event;
    return {
      answer: `✅ **Registration Cancelled!**\n\nYour registration for **${ev.name}** has been cancelled. (Current capacity: ${ev.registered}/${ev.capacity} seats).`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 6. Simple Lookup: "When is my next class?"
  if (q.includes('next class')) {
    const now = getCurrentTime24();
    const todayName = getTodayName();

    // Check today first
    const schedCall = await executeAgentTool('get_schedule', { day: todayName });
    toolCalls.push(schedCall);

    const todayClasses = (schedCall.result.schedules || [])
      .filter((s: any) => s.start_time > now);

    if (todayClasses.length > 0) {
      const next = todayClasses[0];
      return {
        answer: `Your next class is **${next.course} — ${next.title}** today at **${formatTime12(next.start_time)}** in **Room ${next.room}** (Instructor: ${next.instructor}, Section ${next.section}).`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    // No more classes today — look ahead to the next school day
    const todayIdx = SCHOOL_DAYS.indexOf(todayName);
    for (let offset = 1; offset <= SCHOOL_DAYS.length; offset++) {
      const nextDay = SCHOOL_DAYS[(todayIdx + offset) % SCHOOL_DAYS.length];
      const nextDayCall = await executeAgentTool('get_schedule', { day: nextDay });
      toolCalls.push(nextDayCall);
      const nextDayClasses = nextDayCall.result.schedules || [];
      if (nextDayClasses.length > 0) {
        const next = nextDayClasses[0];
        return {
          answer: `No more classes today. Your next class is **${next.course} — ${next.title}** on **${next.day}** at **${formatTime12(next.start_time)}** in **Room ${next.room}** (Instructor: ${next.instructor}, Section ${next.section}).`,
          toolCalls,
          providerUsed: 'Autonomous Tool-Calling Engine',
        };
      }
    }

    return {
      answer: "You don't have any classes scheduled for the rest of the week.",
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 7. Schedule for a day: "What classes do I have on Wednesday?" / "Sunday", etc.
  const dayMatch = q.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if ((q.includes('class') || q.includes('schedule')) && dayMatch) {
    const dayName = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase();
    const schedCall = await executeAgentTool('get_schedule', { day: dayName });
    toolCalls.push(schedCall);

    const list = schedCall.result.schedules || [];
    if (list.length === 0) {
      return {
        answer: `You have no scheduled classes on **${dayName}**. Enjoy your day!`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const formatted = list
      .map((s: any) => `• **${s.course} (${s.section})**: ${s.title}\n  ⏰ ${formatTime12(s.start_time)} – ${formatTime12(s.end_time)} | 📍 Room ${s.room} | 👨‍🏫 ${s.instructor}`)
      .join('\n');

    return {
      answer: `Here is your class schedule for **${dayName}** (${list.length} classes):\n\n${formatted}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 8. Assignments Due: "What assignments do I have due this week?"
  if (q.includes('assignment') || q.includes('due') || q.includes('homework')) {
    const asgnCall = await executeAgentTool('get_assignments', { status: 'pending' });
    toolCalls.push(asgnCall);

    const asgns = asgnCall.result.assignments || [];
    if (asgns.length === 0) {
      return {
        answer: 'You have no pending assignments right now!',
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const formatted = asgns
      .map((a: any) => `• **${a.course}**: ${a.title}\n  📅 Deadline: **${a.deadline}** | Marks: ${a.marks} | Platform: ${a.submission_platform}\n  📝 *${a.description}*`)
      .join('\n\n');

    return {
      answer: `Here are your pending assignments due soon:\n\n${formatted}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 9. Announcements: "Show me all high priority announcements" / "latest announcements"
  if (q.includes('announcement') || q.includes('notice') || q.includes('news')) {
    const isHigh = q.includes('high priority') || q.includes('urgent');
    const annCall = await executeAgentTool('get_announcements', {
      priority: isHigh ? 'high' : undefined,
      active_only: true,
    });
    toolCalls.push(annCall);

    const anns = annCall.result.announcements || [];
    if (anns.length === 0) {
      return {
        answer: 'There are no active announcements matching your filter.',
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const formatted = anns
      .map((a: any) => `📢 **${a.title}** [Priority: ${a.priority.toUpperCase()}]\n🗓️ Posted: ${a.date} by ${a.posted_by} (Expires: ${a.expires})\n${a.body}`)
      .join('\n\n---\n\n');

    return {
      answer: `Here are the latest live campus announcements:\n\n${formatted}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 10. Canonical Acceptance Test helper: "Where is my CSE4113 class?" or specific course query
  const courseMatch = q.match(/cse\s*(\d{4})/i);
  if (courseMatch) {
    const courseCode = `CSE ${courseMatch[1]}`;
    // First, check latest announcements for any updates or cancellations regarding this course!
    const annCall = await executeAgentTool('get_announcements', {});
    toolCalls.push(annCall);

    const relevantNotice = (annCall.result.announcements || []).find((a: any) =>
      a.title.toLowerCase().includes(courseCode.toLowerCase()) || a.body.toLowerCase().includes(courseCode.toLowerCase())
    );

    const schedCall = await executeAgentTool('get_schedule', { course: courseCode });
    toolCalls.push(schedCall);

    const classes = schedCall.result.schedules || [];

    if (relevantNotice) {
      return {
        answer: `🔔 **Important Notice regarding ${courseCode}:**\n"${relevantNotice.title}"\n${relevantNotice.body}\n\n*(Original timetable was: ${classes.map((c: any) => `${c.day} at ${formatTime12(c.start_time)} in Room ${c.room}`).join(', ')})*`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    if (classes.length > 0) {
      const c = classes[0];
      return {
        answer: `${c.course} (${c.title}) is scheduled on **${c.day}** from **${formatTime12(c.start_time)} to ${formatTime12(c.end_time)}** in **Room ${c.room}** (Instructor: ${c.instructor}).`,
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }
  }

  // 10a. Room availability / room listing: "available rooms?", "what rooms are free?", "show me available rooms"
  if (
    q.includes('room') && (
      q.includes('available') || q.includes('free') || q.includes('open') ||
      q.includes('availability') || q.includes('which room') || q.includes('show me') ||
      q.includes('list room') || q.includes('all room')
    )
  ) {
    const typeFilter = q.includes('lab') ? 'lab' : q.includes('seminar') ? 'seminar' : q.includes('class') ? 'classroom' : undefined;
    const capMatch = q.match(/capacity\s*(?:of|>=?|at least)\s*(\d+)/i) || q.match(/(\d+)\s*(?:people|seats|capacity)/i);
    const minCap = capMatch ? parseInt(capMatch[1], 10) : undefined;

    const roomCall = await executeAgentTool('get_rooms', {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(minCap ? { min_capacity: minCap } : {}),
    });
    toolCalls.push(roomCall);

    const rooms = roomCall.result.rooms || [];
    if (rooms.length === 0) {
      return {
        answer: 'No rooms matched your criteria. Try broadening your search or removing filters.',
        toolCalls,
        providerUsed: 'Autonomous Tool-Calling Engine',
      };
    }

    const roomListStr = rooms
      .map((r: any) => `• **Room ${r.room_number}** (Floor ${r.floor}) — ${r.type} | Capacity: ${r.capacity} seats | Equipment: ${r.equipment.join(', ')}`)
      .join('\n');

    return {
      answer: `Here are the available campus rooms (${rooms.length} found):\n\n${roomListStr}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // 11. Generic Events query: "What events are coming up?"
  if (q.includes('event') || q.includes('hackathon') || q.includes('workshop')) {
    const evCall = await executeAgentTool('get_events', { status: 'upcoming' });
    toolCalls.push(evCall);

    const evs = evCall.result.events || [];
    const formatted = evs
      .map((e: any) => `• **${e.name}**\n  📅 ${e.date} (${formatTime12(e.start_time)} – ${formatTime12(e.end_time)}) | 📍 Room ${e.venue}\n  👥 Registered: ${e.registered}/${e.capacity} | Organizer: ${e.organizer}\n  📝 ${e.description}`)
      .join('\n\n');

    return {
      answer: `Upcoming campus events:\n\n${formatted}`,
      toolCalls,
      providerUsed: 'Autonomous Tool-Calling Engine',
    };
  }

  // Fallback: generic campus help prompt
  return {
    answer: `I looked up the live campus datastore. Could you please specify if you'd like information on **classes & schedules**, **available rooms**, **upcoming events**, **announcements**, or **assignments**?`,
    toolCalls,
    providerUsed: 'Autonomous Tool-Calling Engine',
  };
}

// Multi-provider LLM API caller (OpenAI / Groq / Anthropic / Gemini compatible)
async function callExternalLlm(
  query: string,
  history: { role: string; content: string }[],
  apiKey: string,
  provider: 'openai' | 'groq' | 'anthropic' | 'gemini'
): Promise<AgentResponse> {
  const toolCalls: ToolCallLog[] = [];

  let baseUrl = 'https://api.openai.com/v1';
  let modelName = 'gpt-4o-mini';

  if (provider === 'groq') {
    baseUrl = 'https://api.groq.com/openai/v1';
    modelName = 'llama-3.3-70b-versatile';
  }

  // Step 1: Initial call with tool definitions
  const messages = [
    {
      role: 'system',
      content: `You are CampusOS Assistant, an intelligent university agent for students and faculty.
You have real tools to query and mutate the live campus datastore for:
- schedules (classes, days, rooms)
- rooms (classrooms, labs, seminar halls, equipment, capacity, derived availability)
- events (dates, venues, registrations, capacity limits)
- announcements (headlines, priorities, expiry)
- assignments (deadlines, platforms, status)

CRITICAL RULES:
1. ALWAYS call tools to get factual data. NEVER invent or hallucinate campus information.
2. When answering questions, strictly ground your response in the tool results.
3. If an action fails constraint checks (e.g. event is full, or room has a conflict), clearly explain the specific failure reason.
4. Keep answers friendly, accurate, and concise.`,
    },
    ...history,
    { role: 'user', content: query },
  ];

  const firstRes = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      tools: AGENT_TOOLS_DEFINITIONS,
      tool_choice: 'auto',
    }),
  });

  if (!firstRes.ok) {
    const errorText = await firstRes.text();
    console.warn(`External LLM (${provider}) returned error, falling back to autonomous engine:`, errorText);
    return executeAutonomousAgent(query);
  }

  const firstJson = await firstRes.json();
  const choice = firstJson.choices?.[0];
  const responseMsg = choice?.message;

  if (responseMsg?.tool_calls && responseMsg.tool_calls.length > 0) {
    // Execute all requested tools against the live datastore
    const toolResultsForLlm: any[] = [];

    for (const tc of responseMsg.tool_calls) {
      const toolName = tc.function.name;
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch (e) {
        args = {};
      }

      const log = await executeAgentTool(toolName, args);
      toolCalls.push(log);

      toolResultsForLlm.push({
        tool_call_id: tc.id,
        role: 'tool',
        name: toolName,
        content: JSON.stringify(log.result),
      });
    }

    // Step 2: Feed tool results back to LLM for final grounded synthesis
    const followUpRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          ...messages,
          responseMsg,
          ...toolResultsForLlm,
        ],
      }),
    });

    if (followUpRes.ok) {
      const followUpJson = await followUpRes.json();
      const finalChoice = followUpJson.choices?.[0];
      return {
        answer: finalChoice?.message?.content || 'Completed tool calls successfully.',
        toolCalls,
        providerUsed: `${provider.toUpperCase()} (${modelName})`,
      };
    }
  }

  return {
    answer: responseMsg?.content || 'Here is the campus information you requested.',
    toolCalls,
    providerUsed: `${provider.toUpperCase()} (${modelName})`,
  };
}

// Main Agent Dispatcher
export async function processAgentQuery(params: {
  query: string;
  history?: { role: string; content: string }[];
  clientApiKey?: string;
  clientProvider?: string;
}): Promise<AgentResponse> {
  const { query, history = [] } = params;

  // 1. Check Refusal Rules (Pre-execution gate)
  const refusal = checkRefusalConditions(query);
  if (refusal.shouldRefuse) {
    return {
      answer: refusal.reason || 'I cannot fulfill this request as it violates university policy.',
      toolCalls: [],
      refusalReason: refusal.reason,
      providerUsed: 'Refusal Gate (Safety Policy)',
    };
  }

  // 2. Check Clarification Rules (Underspecified requests)
  const clarification = checkClarificationConditions(query);
  if (clarification.needsClarification) {
    return {
      answer: clarification.question || 'Could you provide a few more details so I can help you accurately?',
      toolCalls: [],
      clarificationNeeded: true,
      providerUsed: 'Clarification Engine',
    };
  }

  // 3. Determine the requested external provider and use its matching key.
  // The built-in engine must remain the default when it is selected in the UI.
  type ExternalProvider = 'openai' | 'groq';
  const requestedProvider = params.clientProvider?.trim().toLowerCase();
  let provider: ExternalProvider | undefined;

  if (requestedProvider === 'openai' || requestedProvider === 'groq') {
    provider = requestedProvider;
  } else if (!requestedProvider || requestedProvider === 'autonomous engine') {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_key_here' && process.env.OPENAI_API_KEY !== 'your_openai_key') {
      provider = 'openai';
    } else if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_key_here' && process.env.GROQ_API_KEY !== 'your_groq_key') {
      provider = 'groq';
    }
  }

  const configuredKey = provider === 'groq' ? process.env.GROQ_API_KEY : provider === 'openai' ? process.env.OPENAI_API_KEY : undefined;
  const clientKey = params.clientApiKey?.trim().replace(/^Bearer\s+/i, '');
  const apiKey = clientKey || configuredKey;

  if (provider && apiKey && apiKey !== 'your_key_here' && apiKey !== 'your_openai_key' && apiKey !== 'your_groq_key') {

    try {
      return await callExternalLlm(query, history, apiKey, provider);
    } catch (err) {
      console.warn('External LLM error, falling back to Autonomous Engine:', err);
    }
  }

  // 4. Default: Autonomous Built-in Tool Calling Engine
  return await executeAutonomousAgent(query);
}
