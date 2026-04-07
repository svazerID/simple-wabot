const handler = async (m, { conn }) => {
  const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
  const name   = await conn.getName(target);
  await m.reply(
    `┌─⭓「 *CEK ID* 」\n│ *Nama  :* ${name}\n│ *JID   :* ${target}\n│ *Nomor :* ${target.split('@')[0]}\n└───────────────⭓\n> ${global.wm}`
  );
};
handler.help    = ['cekid [@user]'];
handler.tags    = ['info'];
handler.command = /^(cekid|id|who)$/i;
export default handler;
