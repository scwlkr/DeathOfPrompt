import { prisma } from './db';
import { retrieveContext } from './memory-retrieval';
import { appendTask, parseTasksFromReply, stripTaskMarkers } from './ambition';
import { parseFileSaves, saveWorkspaceFile, stripFileSaveMarkers } from './workspace';
import { logInfo } from './logger';
import { streamText, generateText } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
const ollama = createOllama();

export async function processChat(sessionId: string, userMessage: string, model: string = 'llama3') {
  // Get or create agent session
  let session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    session = await prisma.chatSession.create({
      data: { id: sessionId, agentId: 'default', model }
    });
  }

  // Save user message to transcript
  await prisma.transcriptEntry.create({
    data: {
      sessionId,
      role: 'user',
      content: userMessage
    }
  });

  const context = await retrieveContext(sessionId, session.agentId, userMessage);
  
  const systemPrompt = `You are a personalized assistant.
CONTEXT:
${context.map((c, i) => `--- [Source: ${c.source}] ---\n${c.content}\n--------------------`).join('\n\n')}

INSTRUCTIONS:
Respond to the user naturally based on your SOUL profile and retrieved context.
If the user asks you to remind them of something, add a task, or schedule something,
include a marker in your reply of the form [[TASK: <task text>]] — optionally with
|when:<ISO 8601 UTC datetime> or |recur:<spec> appended. Example:
[[TASK: remind me to book a reservation |when:2026-04-10T15:00:00Z]]
The marker is stripped from the visible reply and appended to AMBITION.md automatically.

If the user asks you to save a file, write a note, or draft a document to their
workspace, wrap the file content like this:
[[SAVE_FILE: business-plan.md]]
# Business Plan
...contents...
[[/SAVE_FILE]]
The block is stripped from the visible reply; the file is saved under data/workspace/.

Current Time: ${new Date().toISOString()}`;

  // Start streaming response
  const stream = await streamText({
    model: ollama(model) as any,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    onFinish: async ({ text }) => {
       const tasks = parseTasksFromReply(text);
       for (const t of tasks) {
         try {
           appendTask(t);
           logInfo('task_appended', { sessionId, task: t });
         } catch (e: any) {
           logInfo('task_append_failed', { sessionId, task: t, error: e?.message });
         }
       }
       const files = parseFileSaves(text);
       for (const f of files) {
         try {
           const fullPath = saveWorkspaceFile(f);
           logInfo('workspace_file_saved', { sessionId, name: f.name, path: fullPath });
         } catch (e: any) {
           logInfo('workspace_file_save_failed', { sessionId, name: f.name, error: e?.message });
         }
       }
       let cleaned = tasks.length ? stripTaskMarkers(text) : text;
       if (files.length) cleaned = stripFileSaveMarkers(cleaned);
       await prisma.transcriptEntry.create({
         data: {
           sessionId,
           role: 'assistant',
           content: cleaned
         }
       });
    }
  });

  return stream.toUIMessageStreamResponse();
}

export async function createSession(agentId: string, model: string) {
  return await prisma.chatSession.create({
    data: { agentId, model }
  });
}
