const handler = async (m, { conn, args, isOwner, isAdmin }) => {
  if (!(isAdmin || isOwner)) return global.dfail('admin', m, conn);
  const chat = global.db.data.chats[m.chat];
  const sub  = args[0]?.toLowerCase();

  const toggleMap = {
    welcome:  'welcome',
    antilink: 'antilink',
    antispam: 'antispam',
    antibot:  'antibot',
    mute:     'mute',
  };

  if (sub && sub in toggleMap) {
    const key = toggleMap[sub];
    chat[key]  = !chat[key];
    return m.reply(`✅ *${key}* sekarang: ${chat[key] ? 'ON' : 'OFF'}`);
  }

  const info = Object.entries(toggleMap)
    .map(([k]) => `│ ${k.padEnd(10)}: ${chat[k] ? '✅ ON' : '❌ OFF'}`)
    .join('\n');
  await m.reply(`┌─⭓「 *SETTINGS GROUP* 」\n${info}\n└───────────────⭓\n\nUsage: .setting [fitur]`);
};
handler.help    = ['setting welcome|antilink|antispam|antibot|mute'];
handler.tags    = ['group'];
handler.command = /^(setting|set)$/i;
handler.group   = true;
export default handler;
