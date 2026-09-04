import { NextRequest, NextResponse } from 'next/server';
import { updateAssignment, deleteAssignment, getAssignmentById } from '@/backend/services';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = getAssignmentById(params.id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = updateAssignment(params.id, body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = deleteAssignment(params.id);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
