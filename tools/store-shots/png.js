// PNG 읽고 쓰기(의존성 없음) — 브라우저가 찍은 RGBA PNG를 알파 없는 RGB(색 형식 2)로 다시 쓴다.
// App Store는 알파 채널이 있는 스크린샷을 거절한다. 알파가 255가 아닌 점은 종이색(bg) 위에 얹는다.
const zlib = require('zlib');

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 머리(IHDR)만 — 너비 · 높이 · 비트 깊이 · 색 형식 */
function readHeader(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIG) || buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG가 아니에요');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bitDepth: buf[24], colorType: buf[25], interlace: buf[28] };
}

function chunks(buf) {
  const out = [];
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    out.push({ type: buf.toString('ascii', o + 4, o + 8), data: buf.subarray(o + 8, o + 8 + len) });
    o += 12 + len;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** 8비트 RGB · RGBA PNG → { width, height, rgb } (알파는 bg 위에 얹어 지운다) */
function decode(buf, bg = [255, 255, 255]) {
  const h = readHeader(buf);
  if (h.bitDepth !== 8 || (h.colorType !== 2 && h.colorType !== 6) || h.interlace !== 0) {
    throw new Error(`읽을 수 없는 PNG 형식(깊이 ${h.bitDepth}, 색 ${h.colorType}, 인터레이스 ${h.interlace})`);
  }
  const bpp = h.colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(chunks(buf).filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const stride = h.width * bpp;
  const cur = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  const rgb = Buffer.alloc(h.width * h.height * 3);
  for (let y = 0; y < h.height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const x = line[i];
      cur[i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 0xff;
    }
    for (let px = 0, o = y * h.width * 3; px < h.width; px++, o += 3) {
      const s = px * bpp;
      if (bpp === 4 && cur[s + 3] !== 255) {
        const al = cur[s + 3] / 255;
        for (let k = 0; k < 3; k++) rgb[o + k] = Math.round(cur[s + k] * al + bg[k] * (1 - al));
      } else {
        rgb[o] = cur[s];
        rgb[o + 1] = cur[s + 1];
        rgb[o + 2] = cur[s + 2];
      }
    }
    cur.copy(prev);
  }
  return { width: h.width, height: h.height, rgb };
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** RGB → PNG(8비트, 색 형식 2). 줄마다 0(없음) · 2(위) 중 작게 남는 거르기를 고른다 */
function encodeRGB({ width, height, rgb }) {
  const stride = width * 3;
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const line = rgb.subarray(y * stride, (y + 1) * stride);
    const o = y * (stride + 1);
    let none = 0;
    let up = 0;
    for (let i = 0; i < stride; i++) {
      const v = line[i];
      none += v < 128 ? v : 256 - v;
      const d = (v - (y > 0 ? rgb[(y - 1) * stride + i] : 0)) & 0xff;
      up += d < 128 ? d : 256 - d;
    }
    if (y > 0 && up < none) {
      out[o] = 2;
      for (let i = 0; i < stride; i++) out[o + 1 + i] = (line[i] - rgb[(y - 1) * stride + i]) & 0xff;
    } else {
      out[o] = 0;
      line.copy(out, o + 1);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // RGB, 알파 없음
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(out, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** 아무 8비트 PNG → 알파 없는 RGB PNG */
function toRGB(buf, bg) {
  return encodeRGB(decode(buf, bg));
}

module.exports = { readHeader, decode, encodeRGB, toRGB, crc32 };
