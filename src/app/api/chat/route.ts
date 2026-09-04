import { NextRequest, NextResponse } from 'next/server';
import { processAgentQuery } from '@/agent/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, apiKey, provider } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Query message is required' }, { status: 400 });
    }

    const response = await processAgentQuery({
      query: message.trim(),
      history: Array.isArray(history) ? history : [],
      clientApiKey: apiKey,
      clientProvider: provider,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
