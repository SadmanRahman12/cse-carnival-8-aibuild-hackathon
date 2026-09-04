import { NextRequest, NextResponse } from 'next/server';
import { registerEvent } from '@/backend/services';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerEvent(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}
