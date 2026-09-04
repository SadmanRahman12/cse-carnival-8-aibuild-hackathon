import { NextRequest, NextResponse } from 'next/server';
import { getAllAnnouncements, createAnnouncement } from '@/backend/services';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const priority = searchParams.get('priority') || undefined;
    const active_only = searchParams.get('active_only') === 'true';

    const announcements = getAllAnnouncements({ priority, active_only });
    return NextResponse.json({ success: true, data: announcements });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createAnnouncement(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
