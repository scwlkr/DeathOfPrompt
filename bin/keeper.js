#!/usr/bin/env node
// DOP Keeper — a tiny standalone Telegram bot that lives OUTSIDE the pod.
// Its only job is to start, stop, and status-check the DOP pod remotely.
// Run it once from a persistent location (nohup, launchd, tmux) so it
// survives `dop pod stop` and can bring the pod back up on command.
//
// Commands (paired chats only):
//   /keep-pair <code>   — pair this chat
//   /pod-start          — `dop pod` (detached)
//   /pod-stop           — `dop pod stop`
//   /pod-status         — `dop pod status`
//   /keep-unpair        — disconnect this chat
//
// The keeper has its own pairing code and allowlist, separate from the
// daemon's. State lives in dop-web/data/.keeper-*.

const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'dop-web', 'data');
const PAIRING_FILE = path.join(DATA_DIR, '.keeper-pairing-code');
const ALLOWLIST_FILE = path.join(DATA_DIR, '.keeper-allowlist.json');
const DOP_BIN = path.join(__dirname, 'dop.js');

// Read TELEGRAM_TOKEN from dop-web/.env so the keeper reuses the same bot.
function loadEnvToken() {
  if (process.env.TELEGRAM_TOKEN) return process.env.TELEGRAM_TOKEN;
  try {
    const env = fs.readFileSync(path.join(REPO_ROOT, 'dop-web', '.env'), 'utf-8');
    const m = env.match(/^TELEGRAM_TOKEN\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return '';
}

const TELEGRAM_TOKEN = loadEnvToken();
if (!TELEGRAM_TOKEN) {
  console.error('❌ No TELEGRAM_TOKEN found (checked env + dop-web/.env).');
  process.exit(1);
}

// node-telegram-bot-api lives in dop-web/node_modules — require from there.
const TelegramBot = require(path.join(REPO_ROOT, 'dop-web', 'node_modules', 'node-telegram-bot-api'));

function loadAllowlist() {
  try {
    const arr = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf-8'));
    return new Set(Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : []);
  } catch { return new Set(); }
}
function saveAllowlist(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify([...s]));
}
function loadOrCreateCode() {
  try {
    const c = fs.readFileSync(PAIRING_FILE, 'utf-8').trim();
    if (c) return c;
  } catch {}
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PAIRING_FILE, code);
  return code;
}

const allowlist = loadAllowlist();
const PAIRING_CODE = loadOrCreateCode();

console.log('🛡️  DOP Keeper starting.');
console.log('   Pairing code: ' + PAIRING_CODE);
console.log('   In Telegram: /keep-pair ' + PAIRING_CODE);
console.log('   Paired chats: ' + (allowlist.size || 'none yet'));

// IMPORTANT: keeper uses getUpdates with a separate offset. When the main
// daemon is ALSO polling, both bots will fight over updates from the same
// token. For a single-bot-token setup, recommend running the keeper with
// HEARTBEAT_ACTIVE=false in a dedicated bot OR accept that only one of the
// two processes will reliably receive each message. In practice: keep the
// keeper up when the pod is DOWN; it'll naturally have the token to itself.
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const isPaired = (id) => allowlist.has(id);
const needPair = (id) => bot.sendMessage(id, '🔒 Send `/keep-pair <code>` — see the keeper console.', { parse_mode: 'Markdown' });

bot.onText(/^\/keep-pair\s+(\S+)/, (msg, m) => {
  const id = msg.chat.id;
  if (m[1].trim() === PAIRING_CODE) {
    allowlist.add(id);
    saveAllowlist(allowlist);
    bot.sendMessage(id, '✅ Keeper paired.\n\nCommands:\n/pod-start\n/pod-stop\n/pod-status\n/keep-unpair');
    console.log(`✅ keeper paired chat ${id}`);
  } else {
    bot.sendMessage(id, '❌ Invalid pairing code.');
  }
});

bot.onText(/^\/keep-unpair\b/, (msg) => {
  const id = msg.chat.id;
  if (allowlist.delete(id)) {
    saveAllowlist(allowlist);
    bot.sendMessage(id, '👋 Keeper unpaired.');
  } else {
    bot.sendMessage(id, '(not paired)');
  }
});

function runDop(args, onDone) {
  execFile('node', [DOP_BIN, ...args], { cwd: REPO_ROOT }, (err, stdout, stderr) => {
    onDone((stdout || '') + (stderr || '') + (err ? `\n[exit ${err.code}]` : ''));
  });
}

bot.onText(/^\/pod-start\b/, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  bot.sendMessage(id, '🚀 Starting pod...');
  // Start the pod detached so it runs independently of the keeper. Logs
  // still land in dop-web/data/logs/pod-*.log.
  const p = spawn('node', [DOP_BIN, 'pod'], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
  });
  p.unref();
  setTimeout(() => {
    runDop(['pod', 'status'], (out) =>
      bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
    );
  }, 3000);
});

bot.onText(/^\/pod-stop\b/, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  bot.sendMessage(id, '🛑 Stopping pod...');
  runDop(['pod', 'stop'], (out) =>
    bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
  );
});

bot.onText(/^\/pod-status\b/, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  runDop(['pod', 'status'], (out) =>
    bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
  );
});

console.log('🛡️  Keeper is alive, waiting on Telegram.');
