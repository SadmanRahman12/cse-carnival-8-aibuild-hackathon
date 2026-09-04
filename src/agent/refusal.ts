export interface RefusalCheckResult {
  shouldRefuse: boolean;
  reason?: string;
  category?: 'unauthorized' | 'nonsensical' | 'destructive' | 'past_time' | 'privacy';
}

export function checkRefusalConditions(userQuery: string): RefusalCheckResult {
  const q = userQuery.toLowerCase().trim();

  // 1. Destructive actions across systems
  if (
    q.includes('delete all') ||
    q.includes('drop database') ||
    q.includes('remove all assignments') ||
    q.includes('cancel all events') ||
    q.includes('wipe all') ||
    q.includes('clear all data')
  ) {
    return {
      shouldRefuse: true,
      category: 'destructive',
      reason: 'Refused: Destructive bulk actions (such as deleting all records or assignments) are strictly prohibited.',
    };
  }

  // 2. Booking in the past or past date requests
  if (
    (q.includes('book') || q.includes('reserve')) &&
    (q.includes('yesterday') || q.includes('last week') || q.includes('last month') || q.includes('2020') || q.includes('2024'))
  ) {
    return {
      shouldRefuse: true,
      category: 'past_time',
      reason: 'Refused: Cannot book a room for a past date or time.',
    };
  }

  // 3. Nonsensical capacity or numbers (e.g. negative people)
  const negMatch = q.match(/-\s*(\d+)\s*(people|person|capacity|seats)/);
  if (negMatch || q.includes('negative capacity') || q.includes('-5 people') || q.includes('-10 people')) {
    return {
      shouldRefuse: true,
      category: 'nonsensical',
      reason: 'Refused: Party size / capacity cannot be negative or zero.',
    };
  }

  // 4. Unauthorized cancellation on behalf of someone else
  if (
    (q.includes('cancel') || q.includes('delete')) &&
    (q.includes('someone else') || q.includes("other's booking") || q.includes("another student's"))
  ) {
    return {
      shouldRefuse: true,
      category: 'unauthorized',
      reason: "Refused: Unauthorized action. You cannot cancel or modify reservations or registrations belonging to another person.",
    };
  }

  // 5. Confidential / private credentials inspection
  if (
    q.includes('private password') ||
    q.includes('admin password') ||
    q.includes('student ssn') ||
    q.includes('secret key')
  ) {
    return {
      shouldRefuse: true,
      category: 'privacy',
      reason: 'Refused: Access to confidential personal or administrative credentials is restricted.',
    };
  }

  return { shouldRefuse: false };
}
