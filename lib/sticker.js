/*─────────────────────────────────────────
  lib/sticker.js – ayanaMD by KennDev
─────────────────────────────────────────*/

import { tmpdir } from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { Image } from 'node-webpmux';

function ffmpegSticker(input, output, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', input, ...args, output]);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`FFmpeg sticker code ${code}`));
      resolve(output);
    });
  });
}

export async function imageToWebp(buffer) {
  const tmp   = tmpdir();
  const inFile  = path.join(tmp, `${Date.now()}.jpg`);
  const outFile = path.join(tmp, `${Date.now()}.webp`);
  await fs.writeFile(inFile, buffer);
  await ffmpegSticker(inFile, outFile, ['-vf', 'scale=512:512:force_original_aspect_ratio=decrease']);
  const data = await fs.readFile(outFile);
  await fs.unlink(inFile).catch(() => {});
  await fs.unlink(outFile).catch(() => {});
  return data;
}

export async function videoToWebp(buffer) {
  const tmp   = tmpdir();
  const inFile  = path.join(tmp, `${Date.now()}.mp4`);
  const outFile = path.join(tmp, `${Date.now()}.webp`);
  await fs.writeFile(inFile, buffer);
  await ffmpegSticker(inFile, outFile, [
    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15',
    '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default',
    '-an', '-vsync', '0', '-s', '512x512',
  ]);
  const data = await fs.readFile(outFile);
  await fs.unlink(inFile).catch(() => {});
  await fs.unlink(outFile).catch(() => {});
  return data;
}

export async function writeExifImg(buffer, metadata = {}) {
  const webp = await imageToWebp(buffer);
  return addExif(webp, metadata);
}

export async function writeExifVid(buffer, metadata = {}) {
  const webp = await videoToWebp(buffer);
  return addExif(webp, metadata);
}

export async function addExif(webpBuffer, metadata = {}) {
  const { packname = '', author = '' } = metadata;
  const img = new Image();
  await img.load(webpBuffer);
  const json = {
    'sticker-pack-id': 'ayanaMD',
    'sticker-pack-name': packname || global.packname || 'ayanaMD',
    'sticker-pack-publisher': author || global.author || 'KennDev',
    emojis: metadata.emojis || ['🤖'],
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00]);
  const jsonBuf  = Buffer.from(JSON.stringify(json));
  const exif     = Buffer.concat([exifAttr, jsonBuf]);
  img.exif       = exif;
  return img.save(null);
}
