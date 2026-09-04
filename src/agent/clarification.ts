export interface ClarificationCheckResult {
  needsClarification: boolean;
  question?: string;
  missingParameters?: string[];
}

export function checkClarificationConditions(userQuery: string): ClarificationCheckResult {
  const q = userQuery.toLowerCase().trim();

  // Check 1: Vague room booking (e.g. "Just book me any room tomorrow afternoon" or "Book me a room")
  const isBookingIntent = (q.includes('book') || q.includes('reserve')) && !q.includes('cancel');
  const hasSpecificRoom = /7[abc]\d{2}/i.test(q); // e.g. 7A02, 7B05, 7C01
  const hasTimeWindow = /\d{1,2}(:\d{2})?\s*(am|pm|\bto\b|-)/i.test(q) || /between\s+\d/i.test(q) || /\d{1,2}\s*pm/i.test(q);

  if (isBookingIntent && !hasSpecificRoom && !hasTimeWindow) {
    return {
      needsClarification: true,
      missingParameters: ['room_or_capacity', 'exact_time', 'purpose'],
      question: 'Which room type or party size do you need, and what exact time window (e.g., 2:00 PM to 4:00 PM) would you like to book?',
    };
  }

  // Check 2: Vague "book any room tomorrow afternoon"
  if (isBookingIntent && (q.includes('any room') || q.includes('tomorrow afternoon') || q.includes('a room for me')) && !hasTimeWindow) {
    return {
      needsClarification: true,
      missingParameters: ['exact_time', 'party_size'],
      question: 'Could you specify the exact start and end times in the afternoon (e.g., 3:00 PM – 5:00 PM) and how many people need seats?',
    };
  }

  // Check 3: Vague event registration without event name
  const isRegisterIntent = (q.includes('register me') || q.includes('sign me up') || q.includes('enroll me')) && !q.includes('cancel') && !q.includes('unregister');
  const mentionsEvent = q.includes('lecture') || q.includes('hackathon') || q.includes('workshop') ||
    q.includes('contest') || q.includes('meeting') || q.includes('orientation') || q.includes('deep learning') ||
    q.includes('git') || q.includes('carnival');

  if (isRegisterIntent && !mentionsEvent) {
    return {
      needsClarification: true,
      missingParameters: ['event_name'],
      question: 'Which campus event would you like to register for?',
    };
  }

  return { needsClarification: false };
}
