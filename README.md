# ayanaMD by KennDev

WhatsApp Bot berbasis **Baileys v7.0.0-rc.9** dengan sistem **ESM (ES Module)**.

## ✨ Fitur
- Sistem plugin hot-reload (chokidar)
- Database JSON otomatis
- Handler modular
- Prefix commands
- Welcome/Goodbye group
- Antilink group
- Level & EXP system
- Premium & limit system

## 📁 Struktur
```
ayanaMD/
├── config.js          ← Konfigurasi utama
├── main.js            ← Entry point Baileys
├── index.js           ← Auto-restart wrapper
├── handler.js         ← Message handler utama
├── database.json      ← Database (auto-generated)
├── lib/
│   ├── serialize.js   ← Serialize pesan + conn methods
│   ├── database.js    ← Init struktur DB per user/chat
│   ├── converter.js   ← FFmpeg audio/video converter
│   ├── sticker.js     ← Sticker creator (webp + exif)
│   └── print.js       ← Logger terminal
├── plugins/
│   ├── _event/        ← Auto-event (antilink, welcome, dll)
│   ├── info/          ← Informasi (menu, ping, profile, dll)
│   ├── group/         ← Group management
│   ├── owner/         ← Owner commands
│   ├── sticker/       ← Sticker tools
│   ├── tools/         ← Utilities
│   ├── fun/           ← Fun commands
│   └── game/          ← Games
└── session/           ← Auth session (auto-generated)
```

## 🚀 Instalasi
```bash
npm install
node index.js
```

## ⚙️ Konfigurasi
Edit **config.js**:
- `global.owner` → Nomor owner (tanpa +)
- `global.isPairing` → `true` = pairing code, `false` = QR
- `global.selfMode` → `true` = hanya owner yang bisa pakai

## 📝 Cara Buat Plugin

```js
// plugins/kategori/namaplugin.js
const handler = async (m, { conn, args, text, isOwner }) => {
  await m.reply('Halo!');
};

handler.help    = ['namacommand'];
handler.tags    = ['kategori'];
handler.command = /^namacommand$/i;

// Opsional:
handler.owner    = true;   // Hanya owner
handler.premium  = true;   // Hanya premium
handler.group    = true;   // Hanya di group
handler.private  = true;   // Hanya di private
handler.admin    = true;   // Hanya admin group
handler.botAdmin = true;   // Bot harus admin

export default handler;
```

## 🔧 Dependensi Utama
- `@whiskeysockets/baileys` ^7.0.0-rc.9
- `chalk` ^5.x (ESM only)
- `node-fetch` ^3.x (ESM only)
- `file-type` ^19.x (ESM only)

> © ayanaMD by KennDev
