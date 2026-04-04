import fs from 'fs';
import path from 'path';

export const logInfo = (event: string, data: any) => {
  writeLog('INFO', event, data);
};

export const logError = (event: string, error: any) => {
  writeLog('ERROR', event, error);
};

function writeLog(level: string, event: string, data: any) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data
    };
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'data', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(logsDir, `dop-${today}.jsonl`);
    
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Failed to write log', err);
  }
}
