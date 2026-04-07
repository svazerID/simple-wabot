const khodams = [
  'Khodam Macan Putih 🐯','Khodam Naga Api 🐉','Khodam Elang Rajawali 🦅',
  'Khodam Ular Emas 🐍','Khodam Singa Biru 🦁','Khodam Rubah Sembilan Ekor 🦊',
  'Khodam Buaya Sakti 🐊','Khodam Gajah Putih 🐘','Khodam Pendekar Angin 💨',
  'Khodam Harimau Kumbang 🐆','Khodam Dewi Sri 🌾','Khodam Nyi Roro Kidul 🌊',
  'Khodam Pangeran Diponegoro ⚔️','Khodam Burung Phoenix 🔥','Khodam Unicorn Langit 🦄',
];

const handler = async (m, { conn }) => {
  const target  = m.mentionedJid?.[0] || m.sender;
  const name    = await conn.getName(target);
  const khodam  = khodams[Math.floor(Math.random() * khodams.length)];
  const power   = Math.floor(Math.random() * 9000) + 1000;
  const rank    = power > 8000 ? 'S+' : power > 6000 ? 'S' : power > 4000 ? 'A' : power > 2000 ? 'B' : 'C';

  await conn.sendMessage(m.chat, {
    text: `🔮 *CEK KHODAM*\n\n👤 Nama: ${name}\n👻 Khodam: ${khodam}\n⚡ Kekuatan: ${power}\n🏆 Rank: ${rank}\n\n> ${global.wm}`,
    mentions: [target],
  }, { quoted: m });
};
handler.help    = ['khodam [@user]'];
handler.tags    = ['fun'];
handler.command = /^(khodam|cekkhodam)$/i;
export default handler;
