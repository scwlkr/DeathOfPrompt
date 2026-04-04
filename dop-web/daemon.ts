import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { chatWithAgent, checkCronTasks } from './src/lib/dop';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''; 
let bot: TelegramBot | null = null;
let savedChatId: number | null = null;

if (TELEGRAM_TOKEN) {
  console.log("Starting Telegram Bot...");
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  bot.on('message', async (msg: any) => {
    const chatId = msg.chat.id;
    savedChatId = chatId; // save latest chat ID to notify them later

    if (!msg.text) return;

    // Show typing status
    bot?.sendChatAction(chatId, 'typing');

    const reply = await chatWithAgent(msg.text);
    bot?.sendMessage(chatId, reply);
  });
} else {
  console.log("No TELEGRAM_TOKEN provided. Telegram bot is disabled. Set TELEGRAM_TOKEN environment variable.");
}

// Every 30 minutes
console.log("Starting CRON job (every 30 minutes)...");
cron.schedule('*/30 * * * *', async () => {
  console.log("Running AMBITION check...");
  const notification = await checkCronTasks();
  
  if (notification) {
    console.log("CRON notification:", notification);
    if (bot && savedChatId) {
      bot.sendMessage(savedChatId, `🔔 *Proactive Alert:*\n${notification}`, { parse_mode: 'Markdown' });
    }
  }
});

console.log("DOP Daemon is running and watching for tasks/messages.");
