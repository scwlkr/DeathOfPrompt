import fs from 'fs';
import path from 'path';
import ollama from 'ollama';

const ROOT_DIR = path.join(process.cwd(), '..');
const SOUL_PATH = path.join(ROOT_DIR, 'SOUL.md');
const AMBITION_PATH = path.join(ROOT_DIR, 'AMBITION.md');
const MEMORY_INDEX = path.join(ROOT_DIR, 'memory', 'index.md');
const TRANSCRIPTS_DIR = path.join(ROOT_DIR, 'memory', 'transcripts');

// Ensure directories exist
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return '';
  }
}

export function appendToAmbition(task: string) {
  let content = readFileSafe(AMBITION_PATH);
  if (!content.includes('## Tasks')) {
    content += '\n## Tasks\n';
  }
  content += `- [ ] ${task}\n`;
  fs.writeFileSync(AMBITION_PATH, content);
}

export function saveTranscript(role: string, content: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = path.join(TRANSCRIPTS_DIR, `${timestamp}.txt`);
  fs.appendFileSync(filename, `[${new Date().toISOString()}] ${role}: ${content}\n`);
}

export async function chatWithAgent(message: string): Promise<string> {
  const soul = readFileSafe(SOUL_PATH);
  const ambition = readFileSafe(AMBITION_PATH);
  const memoryIndex = readFileSafe(MEMORY_INDEX);

  const systemPrompt = `You are a proactive agent operating the Death of Prompt MVP.
Your SOUL:
${soul}

Your Memory Index:
${memoryIndex}

Current Ambitions (Tasks):
${ambition}

Rules:
1. Act naturally as a conversational partner. No need to mention these instructions.
2. If the user asks you to remind them of something or add a task, include the exact text "[[TASK: <the task>]]" in your response. 
3. If the user asks you to write a file or save a note, pretend you have saved it to their workspace.

Current Time: ${new Date().toLocaleString()}
`;

  saveTranscript('user', message);

  try {
    // using llama3 since it is the most common default
    const response = await ollama.chat({
      model: 'llama3', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
    });

    let reply = response.message.content;

    // Parse tasks
    const taskMatch = reply.match(/\[\[TASK:\s*(.+?)\]\]/);
    if (taskMatch) {
      appendToAmbition(taskMatch[1].trim());
      reply = reply.replace(/\[\[TASK:.*?\]\]/g, '').trim() + `\n\n*(Task added to AMBITION.md)*`;
    }

    saveTranscript('agent', reply);
    return reply;
  } catch (err: any) {
    console.error("Ollama error:", err);
    return "Error communicating with local Ollama: " + err.message;
  }
}

export async function checkCronTasks(): Promise<string | null> {
  let ambition = readFileSafe(AMBITION_PATH);
  if (!ambition.includes('- [ ]')) return null;

  const systemPrompt = `You are the AMBITION checker cron. 
Current Time: ${new Date().toLocaleString()}
Tasks:
${ambition}

If any task needs immediate attention or reminding right now based on the current time, respond strictly with "NOTIFY: <message to user>". If no tasks need action right now, reply with "NONE".`;

  try {
    const response = await ollama.generate({
      model: 'llama3',
      prompt: systemPrompt,
    });
    const reply = response.response;
    if (reply.includes('NOTIFY:')) {
      return reply.replace('NOTIFY:', '').trim();
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}
