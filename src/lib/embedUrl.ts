/**
 * Tự nhận diện loại link video người dùng dán vào (Google Drive / m3u8 / embed thường)
 * và chuyển về đúng định dạng có thể phát được.
 * Dùng chung cho: phim up thủ công (WatchManual) và Server tùy chỉnh của phim API (Admin override).
 */
export function buildEmbedUrl(raw: string): { url: string; isDrive: boolean; isM3u8: boolean } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { url: '', isDrive: false, isM3u8: false };

  const isM3u8 = /\.m3u8($|\?)/i.test(trimmed);
  if (isM3u8) return { url: trimmed, isDrive: false, isM3u8: true };

  const isDrive = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
  if (!isDrive) return { url: trimmed, isDrive: false, isM3u8: false };

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { url: `https://drive.google.com/file/d/${fileMatch[1]}/preview`, isDrive: true, isM3u8: false };

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return { url: `https://drive.google.com/file/d/${idMatch[1]}/preview`, isDrive: true, isM3u8: false };

  if (trimmed.includes('/preview')) return { url: trimmed, isDrive: true, isM3u8: false };

  return { url: trimmed.replace(/\/(view|edit)(\?.*)?$/, '/preview'), isDrive: true, isM3u8: false };
}

/**
 * Từ 1 link dán vào (Drive/m3u8/embed bất kỳ), trả ra đúng field lưu trữ
 * để tương thích với cấu trúc CustomEpisode { link_embed, link_m3u8 } sẵn có.
 */
export function linkToEpisodeFields(raw: string): { link_embed: string; link_m3u8: string } {
  const { url, isM3u8 } = buildEmbedUrl(raw);
  return isM3u8 ? { link_embed: '', link_m3u8: url } : { link_embed: url, link_m3u8: '' };
}
