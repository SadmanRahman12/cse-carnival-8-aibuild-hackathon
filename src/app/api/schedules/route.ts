import { NextRequest, NextResponse } from 'next/server';
import { getAllSchedules, createSchedule } from '@/backend/services';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const day = searchParams.get('day') || undefined;
    const course = searchParams.get('course') || undefined;
    const room = searchParams.get('room') || undefined;
    const instructor = searchParams.get('instructor') || undefined;

    const schedules = getAllSchedules({ day, course, room, instructor });
    return NextResponse.json({ success: true, data: schedules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createSchedule(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
