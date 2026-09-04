import { NextRequest, NextResponse } from 'next/server';
import { getAllAssignments, createAssignment } from '@/backend/services';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const course = searchParams.get('course') || undefined;
    const status = searchParams.get('status') || undefined;
    const due_before = searchParams.get('due_before') || undefined;

    const assignments = getAllAssignments({ course, status, due_before });
    return NextResponse.json({ success: true, data: assignments });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createAssignment(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
