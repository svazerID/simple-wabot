/*─────────────────────────────────────────
  lib/print.js – ayanaMD by KennDev
  Logger pesan ke terminal
─────────────────────────────────────────*/

import chalk from 'chalk';
import moment from 'moment-timezone';

export default function printMsg(m, conn = {}) {
  try {
    const type    = m.isGroup ? 'Group' : 'Private';
    const time    = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss');
    const from    = m.isGroup ? (conn.chats?.[m.chat]?.name || m.chat) : m.chat;
    const sender  = m.sender?.split('@')[0] || '';
    const name    = m.name || sender;
    const txt     = m.text ? (m.text.length >= 40 ? m.text.slice(0, 39) + '…' : m.text) : '';
    const cmd     = m.plugin ? chalk.magenta(`[${m.plugin}]`) : '';

    console.log(
      chalk.cyan(`[${time}]`) +
      chalk.yellow(` [${type}]`) +
      ` ${chalk.green(name)} ` +
      chalk.gray(`(${sender})`) +
      ` → ${chalk.white(txt)} ` +
      cmd
    );
  } catch {}
}
