const handler = async (m, { conn, isOwner, isAdmin, isBotAdmin }) => {
  if (!(isAdmin || isOwner)) return global.dfail('admin', m, conn);
  if (!isBotAdmin)           return global.dfail('botAdmin', m, conn);

  const ownerGroup = m.chat.split('-')[0] + '@s.whatsapp.net';

  if (m.quoted) {
    const usr = m.quoted.sender;
    if (usr === ownerGroup || usr === conn.user?.id) return m.reply('Tidak bisa kick itu!');
    await conn.groupParticipantsUpdate(m.chat, [usr], 'remove');
    return m.reply(`✅ Berhasil kick @${usr.split('@')[0]}`, { mentions: [usr] });
  }

  if (!m.mentionedJid?.length) return m.reply('Tag user yang mau dikick!');
  const users = m.mentionedJid.filter((u) => u !== ownerGroup && !u.includes(conn.user?.id));
  for (const u of users) {
    if (u.endsWith('@s.whatsapp.net'))
      await conn.groupParticipantsUpdate(m.chat, [u], 'remove');
  }
  await m.reply(`✅ Berhasil kick ${users.length} user`);
};
handler.help     = ['kick @user'];
handler.tags     = ['group'];
handler.command  = /^(kick|remove|tendang)$/i;
handler.group    = true;
handler.botAdmin = true;
export default handler;
