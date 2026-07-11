/**
 * Netlify Function: m3u8-proxy
 * Proxy m3u8 stream từ KKPhim để tránh CORS
 * GET /.netlify/functions/m3u8-proxy?url=https://...
 */

async function netlifyHandlerFn(event) {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  // Chỉ cho phép domain của KKPhim
  const allowedDomains = [
    'kkphimplayer', 'phimapi.com', 'phimimg.com',
    's1.', 's2.', 's3.', 's4.', 's5.', 's6.', 's7.', 's8.',
    'cdn.', 'stream.', 'video.',
  ];

  const isAllowed = allowedDomains.some(d => url.includes(d));
  if (!isAllowed && !url.includes('.m3u8') && !url.includes('.ts')) {
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
