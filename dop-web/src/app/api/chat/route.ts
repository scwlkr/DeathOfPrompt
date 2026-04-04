import { processChat } from '@/lib/dop-engine';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, sessionId, model } = await request.json();
    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
    }

    return await processChat(sessionId, message, model);
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
