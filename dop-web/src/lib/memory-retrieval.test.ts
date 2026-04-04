import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveContext, saveTopic } from './memory-retrieval';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn();
  PrismaClient.prototype.transcriptEntry = {
    findMany: vi.fn().mockResolvedValue([
      { role: 'user', content: 'What is the speed of light?' },
    ]),
  };
  return { PrismaClient };
});

describe('Memory Retrieval System', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('assembles SOUL context and DB transcripts', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockImplementation((fp: string) => {
      if (fp.includes('SOUL.md')) return '# SOUL\nMocked SOUL Profile';
      if (fp.includes('index.json')) return JSON.stringify({ topics: [] });
      return '';
    });

    const context = await retrieveContext('session-1', 'default', 'hello');
    
    expect(context.length).toBeGreaterThanOrEqual(2);
    expect(context[0].source).toBe('soul');
    expect(context[0].content).toContain('Mocked SOUL Profile');
    expect(context[1].source).toBe('transcript');
  });

  it('falls back gracefully if files are missing', async () => {
    (fs.existsSync as any).mockReturnValue(false);
    (fs.readFileSync as any).mockImplementation((fp: string) => {
      if (fp.includes('index.json')) return JSON.stringify({ topics: [] });
      throw new Error("File not found");
    });

    const context = await retrieveContext('session-1', 'default', 'hello');
    
    // Won't have SOUL, but will have SQLite mocked transcripts
    expect(context.length).toBe(1);
    expect(context[0].source).toBe('transcript');
  });
});
