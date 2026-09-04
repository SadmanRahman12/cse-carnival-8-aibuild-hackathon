// Comprehensive verification test for CampusOS

async function runTests() {
  console.log('=== RUNNING CAMPUSOS VERIFICATION SUITE ===\n');

  const BASE_URL = 'http://localhost:3000';

  // Helper for POST /api/chat
  async function askAgent(query) {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
    });
    const json = await res.json();
    return json.data;
  }

  // Reset database to initial seed state before running suite
  await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });

  // 1. Simple lookup test: "When is my next class?"
  console.log('--- Test 1: Simple Lookup: "When is my next class?" ---');
  const t1 = await askAgent('When is my next class?');
  console.log('Agent Answer:', t1.answer);
  console.log('Tool Calls:', t1.toolCalls.map(t => `${t.tool} -> count: ${t.result?.count || 'ok'}`));
  console.log('Passed:', t1.toolCalls.length > 0 && (t1.answer.includes('Cyber Security') || t1.answer.includes('Pattern Recognition')));
  console.log();

  // 2. Simple lookup test: "What classes do I have on Wednesday?"
  console.log('--- Test 2: Schedule Lookup: "What classes do I have on Wednesday?" ---');
  const t2 = await askAgent('What classes do I have on Wednesday?');
  console.log('Agent Answer:', t2.answer);
  console.log('Passed:', t2.toolCalls.some(t => t.tool === 'get_schedule') && t2.answer.includes('Wednesday'));
  console.log();

  // 3. Multi-source reasoning test: "I'm free until 2 PM — is there anything on campus I could drop into?"
  console.log('--- Test 3: Multi-Source Reasoning: "I\'m free until 2 PM..." ---');
  const t3 = await askAgent("I'm free until 2 PM — is there anything on campus I could drop into?");
  console.log('Agent Answer:', t3.answer);
  console.log('Tool Calls:', t3.toolCalls.map(t => t.tool));
  console.log('Passed:', t3.toolCalls.length >= 2);
  console.log();

  // 4. Multi-filter room query: "Which labs have a projector and can fit at least 30 people?"
  console.log('--- Test 4: Filter Query: "Which labs have a projector and can fit at least 30 people?" ---');
  const t4 = await askAgent('Which labs have a projector and can fit at least 30 people?');
  console.log('Agent Answer:', t4.answer);
  console.log('Passed:', t4.toolCalls.some(t => t.tool === 'get_rooms') && t4.answer.includes('7B'));
  console.log();

  // 5. Action with Gate Check: "Book Room 7A02 tomorrow from 3 PM to 5 PM."
  console.log('--- Test 5: Action: "Book Room 7A02 tomorrow from 3 PM to 5 PM." ---');
  const t5 = await askAgent('Book Room 7A02 tomorrow from 3 PM to 5 PM.');
  console.log('Agent Answer:', t5.answer);
  console.log('Booking Tool Status:', t5.toolCalls[0]?.status);
  console.log('Passed:', t5.toolCalls.some(t => t.tool === 'book_room' && t.status === 'success'));
  console.log();

  // 6. Action Conflict Gate Check: Re-attempt same booking to verify collision refusal
  console.log('--- Test 6: Conflict Gate: Re-booking same Room 7A02 at same time ---');
  const t6 = await askAgent('Book Room 7A02 tomorrow from 3 PM to 5 PM.');
  console.log('Agent Answer:', t6.answer);
  console.log('Refusal Reason:', t6.refusalReason || t6.answer);
  console.log('Passed:', t6.toolCalls.some(t => t.status === 'refused') && (t6.refusalReason || t6.answer).includes('already booked'));
  console.log();

  // 7. Full event registration refusal: "Register me for the Workshop: Git & GitHub for Beginners"
  console.log('--- Test 7: Refusal Gate: Register for Full Event (evt-006) ---');
  const t7 = await askAgent('Register me for the Workshop: Git & GitHub for Beginners');
  console.log('Agent Answer:', t7.answer);
  console.log('Passed:', (t7.refusalReason || t7.answer).includes('full') || (t7.refusalReason || t7.answer).includes('No seats available'));
  console.log();

  // 8. Clarification test: "Just book me any room tomorrow afternoon."
  console.log('--- Test 8: Clarification: Ambiguous request ---');
  const t8 = await askAgent('Just book me any room tomorrow afternoon.');
  console.log('Agent Answer:', t8.answer);
  console.log('Clarification Needed:', t8.clarificationNeeded);
  console.log('Passed:', t8.clarificationNeeded === true);
  console.log();

  // 9. Unauthorized action refusal: "Delete all assignments"
  console.log('--- Test 9: Refusal Gate: Destructive request ---');
  const t9 = await askAgent('Delete all assignments');
  console.log('Agent Answer:', t9.answer);
  console.log('Refusal Reason:', t9.refusalReason);
  console.log('Passed:', (t9.refusalReason || t9.answer).includes('prohibited') || (t9.refusalReason || t9.answer).includes('Refused'));
  console.log();

  // 10. CANONICAL ACCEPTANCE TEST: Live Sync
  console.log('--- Test 10: CANONICAL ACCEPTANCE TEST: Live Sync ---');
  console.log('Step 1: Edit announcement ann-001 in Data Manager');
  const editRes = await fetch(`${BASE_URL}/api/announcements/ann-001`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'CSE 4113 Class MOVED to Room 7C03 at 4:00 PM — Live Sync Test',
      body: 'NOTICE: CSE 4113 has been officially moved to Room 7C03 at 4:00 PM today.',
      priority: 'high',
      posted_by: 'Prof. Dr. Md. Shahriar Mahbub',
      date: '2026-09-04',
      expires: '2026-09-10',
    }),
  });
  const editJson = await editRes.json();
  console.log('Edit Success:', editJson.success);

  console.log('Step 2: Immediately ask the AI Agent: "Where is my CSE4113 class?"');
  const t10 = await askAgent('Where is my CSE4113 class?');
  console.log('Agent Answer:', t10.answer);
  const liveSyncVerified = t10.answer.includes('Room 7C03') && t10.answer.includes('Live Sync Test');
  console.log('CANONICAL LIVE SYNC VERIFIED:', liveSyncVerified);
  console.log();

  // 11. Extra Action: Cancel Room Booking
  console.log('--- Test 11: Extra Action: Cancel Room Booking ---');
  const t11 = await askAgent('Cancel my booking for Room 7A02');
  console.log('Agent Answer:', t11.answer);
  console.log('Passed:', t11.toolCalls.some(t => t.tool === 'cancel_booking' && t.status === 'success'));
  console.log();

  // 12. Extra Action: Cancel Event Registration
  console.log('--- Test 12: Extra Action: Cancel Event Registration ---');
  const t12 = await askAgent('Cancel my registration for Guest Lecture on Deep Learning');
  console.log('Agent Answer:', t12.answer);
  console.log('Passed:', t12.toolCalls.some(t => t.tool === 'cancel_registration' && t.status === 'success'));
  console.log();

  console.log('=== ALL TESTS EXECUTED ===');
}

runTests().catch(console.error);
