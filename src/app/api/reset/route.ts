import { NextResponse } from 'next/server';
import { resetDatabase } from '@/backend/datastore';

export async function POST() {
  try {
    const data = resetDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database reset to initial seed data successfully',
      stats: {
        schedules: data.schedules.length,
        rooms: data.rooms.length,
        events: data.events.length,
        announcements: data.announcements.length,
        assignments: data.assignments.length,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
