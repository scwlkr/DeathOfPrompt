import { processChat } from '@/lib/dop-engine';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages, sessionId, model } = await request.json();
    const lastMessage = messages?.[messages.length - 1];
    const message = lastMessage?.content || 
                    lastMessage?.text || 
                    lastMessage?.parts?.find((p: any) => p.type === 'text')?.text;

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
    }

    return await processChat(sessionId, message, model);
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
