import { NextResponse } from 'next/server';
import { listTasks, appendTask, dueTasks } from '@/lib/ambition';
import { logInfo, logError } from '@/lib/logger';

// GET /api/ambition?due=1 → list all tasks, or only ones due now
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyDue = searchParams.get('due') === '1';
    const tasks = onlyDue ? dueTasks() : listTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    logError('ambition_list_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'AMBITION_LIST_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/ambition { task: "buy milk |when:2026-04-05T09:00:00Z" }
export async function POST(request: Request) {
  try {
    const { task } = await request.json();
    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Missing task', code: 'AMBITION_MISSING_TASK' },
        { status: 400 }
      );
    }
    appendTask(task);
    logInfo('task_appended_manual', { task });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logError('ambition_append_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'AMBITION_APPEND_FAILED' },
      { status: 500 }
    );
  }
}
