import { fileTypeFromBuffer } from 'file-type';
import { writeExifImg, writeExifVid } from '../../lib/sticker.js';

const handler = async (m, { conn, args }) => {
  const packname = args[0] || global.packname;
  const author   = args[1] || global.author;

  const quoted = m.quoted || m;
  if (!quoted.mediaType) return m.reply('Kirim/reply gambar atau video pendek!');

  await m.reply(global.wait);
  const buf  = await quoted.download();
  const type = await fileTypeFromBuffer(buf);
  const mime = type?.mime || '';

  let webp;
  if (mime.startsWith('image/')) {
    webp = await writeExifImg(buf, { packname, author });
  } else if (mime.startsWith('video/')) {
    webp = await writeExifVid(buf, { packname, author });
  } else {
    return m.reply('Format tidak didukung! Kirim gambar atau video.');
  }

  await conn.sendMessage(m.chat, { sticker: webp }, { quoted: m });
};

handler.help    = ['sticker [packname] [author]'];
handler.tags    = ['sticker'];
handler.command = /^(sticker|s|stic)$/i;
export default handler;
