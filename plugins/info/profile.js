const handler = async (m, { conn }) => {
  const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
  const user   = global.db.data.users[target] || {};
  const name   = await conn.getName(target);
  let pp = global.icon;
  try { pp = await conn.profilePictureUrl(target, 'image'); } catch {}

  const role = global.owner.includes(target.split('@')[0])
    ? '👑 Owner'
    : user.moderator ? '🛡️ Moderator'
    : user.premium   ? '💎 Premium'
    : '👤 Member';

  const text = [
    `┌─⭓「 *PROFILE* 」`,
    `│ *Nama    :* ${name}`,
    `│ *Role    :* ${role}`,
    `│ *Level   :* ${user.level || 1}`,
    `│ *EXP     :* ${user.exp || 0}`,
    `│ *Limit   :* ${user.limit ?? 100}`,
    `│ *Saldo   :* ${(user.saldo || 0).toLocaleString('id-ID')}`,
    `│ *Status  :* ${user.banned ? '🚫 Banned' : '✅ Aktif'}`,
    `└───────────────⭓`,
    `> ${global.wm}`,
  ].join('\n');

  await conn.sendMessage(m.chat, { image: { url: pp }, caption: text, mentions: [target] }, { quoted: m });
};
handler.help    = ['profile [@user]'];
handler.tags    = ['info'];
handler.command = /^(profile|profil|me)$/i;
export default handler;
