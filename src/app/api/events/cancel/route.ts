import { NextRequest, NextResponse } from 'next/server';
import { cancelRegistration, cancelEvent } from '@/backend/services';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // If action is to cancel the event itself
    if (body.action === 'cancel_event' && body.event_id) {
      const result = cancelEvent(body.event_id);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Otherwise cancel student registration
    const result = cancelRegistration({
      event_id: body.event_id,
      event_name: body.event_name,
      student_id: body.student_id,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}
