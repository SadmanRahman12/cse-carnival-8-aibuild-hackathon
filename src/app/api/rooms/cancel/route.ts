import { NextRequest, NextResponse } from 'next/server';
import { cancelBooking } from '@/backend/services';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_number, booking_id, requested_by } = body;
    if (!room_number || !booking_id) {
      return NextResponse.json({ success: false, reason: 'Missing room_number or booking_id' }, { status: 400 });
    }

    const result = cancelBooking(room_number, booking_id, requested_by);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}
