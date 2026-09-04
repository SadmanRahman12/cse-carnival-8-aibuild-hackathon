import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, createRoom, searchRooms } from '@/backend/services';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const floor = searchParams.get('floor') ? Number(searchParams.get('floor')) : undefined;
    const type = searchParams.get('type') || undefined;
    const min_capacity = searchParams.get('min_capacity') ? Number(searchParams.get('min_capacity')) : undefined;
    const status = searchParams.get('status') || undefined;
    const equipmentStr = searchParams.get('equipment');
    const equipment = equipmentStr ? equipmentStr.split(',').map(e => e.trim()) : undefined;

    // Optional dynamic search parameters
    const date = searchParams.get('date');
    const start_time = searchParams.get('start_time');
    const end_time = searchParams.get('end_time');

    if (date && start_time && end_time) {
      const result = searchRooms({
        date,
        start_time,
        end_time,
        capacity: min_capacity,
        equipment,
        type,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const rooms = getAllRooms({ floor, type, equipment, min_capacity, status });
    return NextResponse.json({ success: true, data: rooms });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createRoom(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
