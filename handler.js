/*─────────────────────────────────────────
  handler.js – ayanaMD by KennDev
  Main message handler + participant update
─────────────────────────────────────────*/

import {
  getAggregateVotesInPollMessage,
  proto,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  jidNormalizedUser,
  WAMessageStubType,
} from '@whiskeysockets/baileys';
import { smsg } from './lib/serialize.js';
import initDatabase from './lib/database.js';
import printMsg from './lib/print.js';
import moment from 'moment-timezone';
import fs from 'fs';
import util from 'util';
import chalk from 'chalk';

const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay    = (ms) => isNumber(ms) && new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════
   MAIN HANDLER
══════════════════════════════════════ */
export async function handler(chatUpdate) {
  if (global.db.data == null) await global.loadDatabase();

  this.msgqueque = this.msgqueque || [];
  if (!chatUpdate) return;

  await this.pushMessage(chatUpdate.messages).catch(console.error);

  let m = chatUpdate.messages[chatUpdate.messages.length - 1];
  if (!m) return;
  if (m.key.fromMe) return;
  if (!m.message) return;

  // Filter protocol / reaction noise
  if (m.message.protocolMessage) return;
  if (m.message.reactionMessage) return;

  try {
    m = smsg(this, m) || m;
    if (!m) return;

    m.exp   = 0;
    m.limit = false;

    // Init database structure
    try { initDatabase(m); } catch (e) { console.error(e); }

    /* ── Roles ─────────────────────── */
    const isROwner = [
      this.decodeJid(global.conn.user.id),
      ...global.owner.map((a) => a + '@s.whatsapp.net'),
    ].includes(m.sender);
    const isOwner = isROwner || m.fromMe;
    const isMods  = global.db.data.users[m.sender]?.moderator || false;
    const isPrems = global.db.data.users[m.sender]?.premium   || false;
    const isBans  = global.db.data.users[m.sender]?.banned    || false;
    const isWhitelist = global.db.data.chats[m.chat]?.whitelist || false;

    /* ── Group metadata ─────────────── */
    if (m.isGroup) {
      try {
        const meta = await this.groupMetadata(m.chat);
        const members = meta.participants.map((a) => a.id);
        global.db.data.chats[m.chat].member = members;
        global.db.data.chats[m.chat].chat += 1;
      } catch {}
    }

    // Helper: normalisasi JID dari participant (penting untuk deteksi admin)
    const getJid = (sender) => this.getJid ? this.getJid(sender) : this.decodeJid(sender);

    /* ── Auto-set owner perms ───────── */
    if (isROwner) {
      global.db.data.users[m.sender].premium     = true;
      global.db.data.users[m.sender].premiumDate = 'PERMANENT';
      global.db.data.users[m.sender].limit       = 'PERMANENT';
      global.db.data.users[m.sender].moderator   = true;
    } else if (isPrems) {
      global.db.data.users[m.sender].limit = 'PERMANENT';
    } else if (!isROwner && isBans) return;

    /* ── Self / gconly guards ───────── */
    if (global.selfMode && !isOwner && !isPrems && !isMods && !isWhitelist) return;
    if (global.gconly && !m.isGroup && !isOwner) return;

    /* ── Queue ──────────────────────── */
    if (global.opts?.queque && m.text && !(isMods || isPrems)) {
      const queque = this.msgqueque;
      const prev   = queque[queque.length - 1];
      queque.push(m.id || m.key.id);
      const t = setInterval(async () => {
        if (!queque.includes(prev)) clearInterval(t);
        else await delay(1000 * 5);
      }, 1000 * 5);
    }

    global.db.data.users[m.sender].online = Date.now();
    global.db.data.users[m.sender].chat += 1;
    if (global.opts?.autoread) await this.readMessages([m.key]);
    if (global.opts?.nyimak) return;

    if (typeof m.text !== 'string') m.text = '';
    if (m.isBaileys) return;
    m.exp += Math.ceil(Math.random() * 1000);

    /* ── Plugin loop ────────────────── */
    let usedPrefix;
    const _user = global.db.data.users[m.sender];

    const groupMetadata = (m.isGroup ? ((global.store?.groupMetadata?.[m.chat]) || (await this.groupMetadata(m.chat).catch(() => null)) || {}) : {}) || {};
    const participants  = (m.isGroup ? groupMetadata.participants : []) || [];
    const user          = (m.isGroup ? participants.find((u) => this.decodeJid(u.id) === getJid(m.sender)) : {}) || {};
    const bot           = (m.isGroup ? participants.find((u) => this.decodeJid(u.id) === this.decodeJid(this.user?.id)) : {}) || {};
    const isRAdmin      = user?.admin === 'superadmin' || false;
    const isAdmin       = isRAdmin || user?.admin === 'admin' || false;
    const isBotAdmin    = !!bot?.admin;

    // Update store dengan metadata terbaru
    if (m.isGroup && groupMetadata.id) {
      global.store.groupMetadata[m.chat] = groupMetadata;
    }

    for (const name in global.plugins) {
      let plugin = global.plugins[name];
      if (!plugin) continue;
      if (plugin.disabled) continue;

      /* run .all() – event hooks */
      if (typeof plugin.all === 'function') {
        try { await plugin.all.call(this, m, chatUpdate); } catch (e) { console.error(e); }
      }

      const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
      const _prefix = plugin.customPrefix
        ? plugin.customPrefix
        : this.prefix
        ? this.prefix
        : global.prefix;

      const match = (
        _prefix instanceof RegExp
          ? [[_prefix.exec(m.text), _prefix]]
          : Array.isArray(_prefix)
          ? _prefix.map((p) => {
              const re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
              return [re.exec(m.text), re];
            })
          : typeof _prefix === 'string'
          ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
          : [[[], new RegExp()]]
      ).find((p) => p[1]);

      /* .before() – pre-command hook */
      if (typeof plugin.before === 'function') {
        if (
          await plugin.before.call(this, m, {
            match, conn: this, participants, groupMetadata,
            user, bot, isROwner, isOwner, isRAdmin, isAdmin,
            isBotAdmin, isPrems, isBans, chatUpdate,
          })
        ) continue;
      }

      if (typeof plugin !== 'function') continue;
      if (!match) continue;

      const result =
        ((global.opts?.multiprefix ?? true) && (match[0] || '')[0]) ||
        ((global.opts?.noprefix ?? false) ? null : (match[0] || '')[0]);
      usedPrefix = result;

      let noPrefix;
      if (isOwner) {
        noPrefix = !result ? m.text : m.text.replace(result, '');
      } else {
        noPrefix = !result ? '' : m.text.replace(result, '').trim();
      }

      let [command, ...args] = noPrefix.trim().split(/\s+/).filter(Boolean);
      args    = args || [];
      const _args = noPrefix.trim().split(/\s+/).slice(1);
      const text  = _args.join(' ');
      command     = (command || '').toLowerCase();
      const fail  = plugin.fail || global.dfail;

      const prefixCommand = !result ? plugin.customPrefix || plugin.command : plugin.command;
      const isAccept =
        (prefixCommand instanceof RegExp && prefixCommand.test(command)) ||
        (Array.isArray(prefixCommand) && prefixCommand.some((c) =>
          c instanceof RegExp ? c.test(command) : c === command
        )) ||
        (typeof prefixCommand === 'string' && prefixCommand === command);

      m.prefix   = !!result;
      usedPrefix = !result ? '' : result;
      if (!isAccept) continue;

      m.plugin     = name;
      m.chatUpdate = chatUpdate;
      m.command    = command;
      m.isCommand  = true;

      /* Chat/mute ban guard */
      const chatData = global.db.data.chats[m.chat];
      if (chatData?.isBanned && !isOwner) return;
      if (chatData?.mute && !isAdmin && !isOwner) return;

      /* Block command */
      if (global.db.data.settings?.blockcmd?.includes(command)) {
        dfail('block', m, this); continue;
      }

      /* Permission checks */
      if (plugin.rowner && !isROwner)          { fail('rowner',   m, this); continue; }
      if (plugin.owner  && !isOwner)           { fail('owner',    m, this); continue; }
      if (plugin.mods   && !isMods)            { fail('mods',     m, this); continue; }
      if (plugin.premium && !isPrems)          { fail('premium',  m, this); continue; }
      if (plugin.group   && !m.isGroup)        { fail('group',    m, this); continue; }
      if (plugin.botAdmin && !isBotAdmin)      { fail('botAdmin', m, this); continue; }
      if (plugin.admin    && !isAdmin)         { fail('admin',    m, this); continue; }
      if (plugin.private  && m.isGroup)        { fail('private',  m, this); continue; }
      if (plugin.register && !_user.registered){ fail('unreg',    m, this); continue; }

      /* Limit check */
      if (typeof _user.limit === 'number' && _user.limit < 1) {
        await this.reply(m.chat, `*[ LIMIT HABIS ]*\n> Limit kamu habis. Tunggu 24 jam atau upgrade premium.`, m);
        continue;
      }

      /* Level check */
      if (plugin.level && plugin.level > _user.level) {
        await this.reply(m.chat, `*[ LEVEL KURANG ]*\n> Butuh level *${plugin.level}* untuk menggunakan fitur ini.`, m);
        continue;
      }

      /* Stat tracker */
      const now  = Date.now();
      const stat = global.db.data.respon[m.command];
      if (stat) {
        stat.total  = (stat.total  || 0) + 1;
        stat.last   = now;
      } else {
        global.db.data.respon[m.command] = { total: 1, success: 0, last: now, lastSuccess: 0 };
      }

      const xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
      m.exp += xp;

      const extra = {
        match, usedPrefix, noPrefix, _args, args, command, text,
        conn: this, participants, groupMetadata, user, bot,
        isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin,
        isPrems, isBans, chatUpdate,
      };

      try {
        await plugin.call(this, m, extra);
        if (!isPrems) m.limit = m.limit || plugin.limit || true;

        const s = global.db.data.respon[m.command];
        s.success     = (s.success || 0) + 1;
        s.lastSuccess = now;
      } catch (e) {
        m.error = e;
        console.error(chalk.red('[Plugin Error]'), e);
        if (e && e.name) {
          const errText = util.format(e);
          for (const jid of global.owner) {
            const data = (await this.onWhatsApp(jid + '@s.whatsapp.net'))[0] || {};
            if (data.exists)
              await this.reply(
                data.jid,
                `*[ REPORT ERROR ]*\n*Plugin:* ${m.plugin}\n*From:* @${m.sender.split('@')[0]}\n*Chat:* ${m.chat}\n*Cmd:* ${usedPrefix + command}\n\n\`\`\`${errText}\`\`\``,
                global.fkontak
              );
          }
          await m.reply('*[ Sistem ]* Terjadi error pada bot!');
        }
      } finally {
        if (typeof plugin.after === 'function') {
          try { await plugin.after.call(this, m, extra); } catch (e) { console.error(e); }
        }
      }
      break;
    }
  } catch (e) {
    console.error(chalk.red('[Handler Error]'), e);
  } finally {
    if (global.opts?.queque && m?.text) {
      const idx = this.msgqueque.indexOf(m.id || m.key?.id);
      if (idx !== -1) this.msgqueque.splice(idx, 1);
    }

    /* Exp & limit update */
    if (m) {
      const u = global.db.data.users[m.sender];
      if (u) {
        u.exp   += m.exp   || 0;
        u.limit -= m.limit ? 1 : 0;
      }
    }

    try { printMsg(m, this); } catch {}
  }
}

/* ══════════════════════════════════════
   PARTICIPANTS UPDATE (welcome / bye)
══════════════════════════════════════ */
export async function participantsUpdate({ id, participants, action }) {
  if (global.opts?.self) return;
  const chat = global.db.data.chats[id] || {};

  switch (action) {
    case 'add':
    case 'remove': {
      if (!chat.welcome) break;
      let meta;
      try { meta = await this.groupMetadata(id); } catch { break; }

      for (const user of participants) {
        const nama   = await this.getName(user);
        const gpname = meta.subject;
        const member = meta.participants.length;
        const time   = moment.tz('Asia/Jakarta').format('HH:mm:ss');

        let pp = global.icon;
        try { pp = await this.profilePictureUrl(user, 'image'); } catch {}

        const text = action === 'add'
          ? (chat.sWelcome || `┌─⭓「 *WELCOME* 」\n│ *Nama:* ${nama}\n│ *Group:* ${gpname}\n│ *Member:* ${member}\n│ *Waktu:* ${time}\n└───────────────⭓\n> Selamat datang @${user.split('@')[0]}!`)
          : (chat.sBye     || `┌─⭓「 *GOODBYE* 」\n│ *Nama:* ${nama}\n│ *Group:* ${gpname}\n│ *Member:* ${member}\n│ *Waktu:* ${time}\n└───────────────⭓\n> Sampai jumpa @${user.split('@')[0]}!`);

        await this.sendMessage(id, {
          text,
          contextInfo: {
            mentionedJid: [user],
            externalAdReply: {
              title: action === 'add' ? `Welcome, ${nama}!` : `Goodbye, ${nama}!`,
              body: global.wm,
              thumbnailUrl: pp,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        });
      }
      break;
    }
    case 'promote':
    case 'demote': {
      if (!chat.detect) break;
      const text = (action === 'promote'
        ? (chat.sPromote || `@${participants[0].split('@')[0]} sekarang menjadi Admin`)
        : (chat.sDemote  || `@${participants[0].split('@')[0]} tidak lagi Admin`)
      ).replace('@user', `@${participants[0].split('@')[0]}`);
      await this.sendMessage(id, { text, mentions: participants });
      break;
    }
  }
}

/* ══════════════════════════════════════
   DFAIL – global fail handler
══════════════════════════════════════ */
global.dfail = async (type, m, conn) => {
  const msgs = {
    owner:    `┌─⭓「 *OWNER ONLY* 」\n│ Fitur ini hanya untuk Owner!\n└───────────────⭓`,
    rowner:   `┌─⭓「 *REAL OWNER ONLY* 」\n│ Fitur ini hanya untuk Real Owner!\n└───────────────⭓`,
    mods:     `┌─⭓「 *MODERATOR ONLY* 」\n│ Fitur ini hanya untuk Moderator bot!\n└───────────────⭓`,
    premium:  `┌─⭓「 *PREMIUM ONLY* 」\n│ Fitur ini hanya untuk pengguna Premium!\n└───────────────⭓`,
    group:    `┌─⭓「 *GROUP ONLY* 」\n│ Fitur ini hanya bisa digunakan di Group!\n└───────────────⭓`,
    private:  `┌─⭓「 *PRIVATE ONLY* 」\n│ Fitur ini hanya bisa digunakan di Private!\n└───────────────⭓`,
    admin:    `┌─⭓「 *ADMIN ONLY* 」\n│ Fitur ini hanya untuk Admin group!\n└───────────────⭓`,
    botAdmin: `┌─⭓「 *BOT BUKAN ADMIN* 」\n│ Jadikan bot Admin terlebih dahulu!\n└───────────────⭓`,
    block:    `┌─⭓「 *COMMAND DIBLOKIR* 」\n│ Command ini telah diblokir!\n└───────────────⭓`,
    unreg:    `┌─⭓「 *BELUM DAFTAR* 」\n│ Ketik *.daftar nama.umur* untuk mendaftar!\n└───────────────⭓`,
  };

  if (msgs[type]) {
    return conn.sendMessage(
      m.chat,
      {
        text: msgs[type],
        contextInfo: {
          externalAdReply: {
            title: 'Access Denied!',
            body: global.wm,
            thumbnailUrl: global.thumb,
            mediaType: 1,
            renderLargerThumbnail: false,
          },
        },
      },
      { quoted: m }
    );
  }
};
