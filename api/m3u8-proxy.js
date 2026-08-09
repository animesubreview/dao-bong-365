/**
 * Netlify Function: m3u8-proxy
 * Proxy m3u8 stream từ KKPhim để tránh CORS
 * GET /.netlify/functions/m3u8-proxy?url=https://...
 */

import { checkRateLimit, getClientIp } from './_rateLimit.js';

async function netlifyHandlerFn(event) {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  // Chống bot spam / lợi dụng proxy làm bàn đạp tấn công nơi khác:
  // giới hạn 1 IP tối đa 120 request/phút tới endpoint proxy này.
  const ip = getClientIp(event);
  if (!checkRateLimit(ip, 'm3u8-proxy', 120, 60_000)) {
    return { statusCode: 429, body: 'Too many requests, please try again later.' };
  }

  // Chỉ cho phép domain của KKPhim — KHÔNG dùng ".m3u8"/".ts" làm điều kiện fallback
  // (trước đây fallback này cho phép proxy TỚI BẤT KỲ URL NÀO, bị lợi dụng làm open-proxy).
  let parsed;
  try { parsed = new URL(url); } catch { return { statusCode: 400, body: 'Invalid url' }; }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { statusCode: 400, body: 'Invalid protocol' };
  }
  const allowedSuffixes = ['phimapi.com', 'phimimg.com', 'kkphimplayer.com', 'kkphimplayer.net'];
  const allowedPrefixPattern = /^(s\d+|cdn\d*|stream\d*|video\d*)\./i; // vd: s1., s23., cdn2., stream.
  const isAllowed =
    allowedSuffixes.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d)) ||
    allowedPrefixPattern.test(parsed.hostname) ||
    parsed.hostname.includes('kkphimplayer');
  if (!isAllowed) {
    return { statusCode: 403, body: 'Domain not allowed' };
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://kkphim.vip/',
        'Origin': 'https://kkphim.vip',
      },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: `Upstream error: ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    const isM3u8 = url.endsWith('.m3u8') || contentType.includes('mpegurl');

    if (isM3u8) {
      // Rewrite m3u8 - replace absolute URLs with proxied URLs
      let text = await response.text();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Replace relative .ts and .m3u8 URLs with proxied versions
      text = text.replace(/^(?!#)(.+\.(ts|m3u8|aac|mp4))$/gm, (match) => {
        if (match.startsWith('http')) {
          return `/.netlify/functions/m3u8-proxy?url=${encodeURIComponent(match)}`;
        } else {
          return `/.netlify/functions/m3u8-proxy?url=${encodeURIComponent(baseUrl + match)}`;
        }
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
        body: text,
      };
    } else {
      // Binary .ts segments
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const base64 = btoa(binary);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
        body: base64,
        isBase64Encoded: true,
      };
    }
  } catch (err) {
    return { statusCode: 500, body: `Proxy error: ${err.message}` };
  }
};

import { wrapNetlifyHandler } from './_compat.js';
export default wrapNetlifyHandler(netlifyHandlerFn);
