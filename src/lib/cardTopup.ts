// ─── Nạp Thẻ Cào — nappay.vn ─────────────────────────────────────────────────

export type CardTelco = 'VIETTEL' | 'VINAPHONE' | 'MOBIFONE' | 'VNMOBI' | 'ZING';

export interface CardTopupConfig {
  partner_id: string;
  partner_key: string;
}

export interface CardTopupRequest {
  telco: CardTelco;
  amount: number;
  serial: string;
  pin: string;
}

export interface CardTopupResult {
  ok: boolean;
  status?: number;   // 1 = success, 2 = error, 99 = pending
  message?: string;
  request_id?: string;
  error?: string;
}

// Validate định dạng thẻ trước khi gửi lên API
export function validateCard(telco: CardTelco, serial: string, pin: string): string | null {
  const s = serial.trim().length;
  const p = pin.trim().length;

  switch (telco) {
    case 'VIETTEL':
      if (s !== 11 && s !== 14) return 'Serial Viettel phải có 11 hoặc 14 ký tự';
      if (p !== 13 && p !== 15) return 'Mã thẻ Viettel phải có 13 hoặc 15 ký tự';
      break;
    case 'MOBIFONE':
      if (s !== 15) return 'Serial Mobifone phải có 15 ký tự';
      if (p !== 12) return 'Mã thẻ Mobifone phải có 12 ký tự';
      break;
    case 'VINAPHONE':
      if (s !== 14) return 'Serial Vinaphone phải có 14 ký tự';
      if (p !== 14) return 'Mã thẻ Vinaphone phải có 14 ký tự';
      break;
    case 'VNMOBI':
      if (s !== 16) return 'Serial Vietnamobile phải có 16 ký tự';
      if (p !== 12) return 'Mã thẻ Vietnamobile phải có 12 ký tự';
      break;
    case 'ZING':
      if (s !== 12) return 'Serial Zing phải có 12 ký tự';
      if (p !== 9)  return 'Mã thẻ Zing phải có 9 ký tự';
      break;
  }
  return null;
}

export const TELCO_LABELS: Record<CardTelco, string> = {
  VIETTEL:   'Viettel',
  VINAPHONE: 'Vinaphone',
  MOBIFONE:  'Mobifone',
  VNMOBI:    'Vietnamobile',
  ZING:      'Zing',
};

export const CARD_AMOUNTS = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000, 2000000];

export function formatCardAmount(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

// Tạo request_id ngẫu nhiên
function makeRequestId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return prefix + Date.now();
}

export async function submitCardTopup(
  cfg: CardTopupConfig,
  req: CardTopupRequest
): Promise<CardTopupResult> {
  const validErr = validateCard(req.telco, req.serial, req.pin);
  if (validErr) return { ok: false, error: validErr };

  const request_id = makeRequestId();

  try {
    const res = await fetch('/.netlify/functions/card-topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id:  cfg.partner_id,
        partner_key: cfg.partner_key,
        telco:       req.telco,
        amount:      req.amount,
        serial:      req.serial.trim(),
        pin:         req.pin.trim(),
        request_id,
      }),
    });

    let data: any;
    try { data = await res.json(); }
    catch { return { ok: false, error: `Lỗi máy chủ (HTTP ${res.status})` }; }

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    // nappay.vn: status 99 = đang xử lý (pending), 1 = thành công, 2 = lỗi
    const status = data.status ?? data.data?.status;
    if (status === 99 || status === '99') {
      return { ok: true, status: 99, message: 'Thẻ đang được xử lý, vui lòng chờ kết quả qua callback.', request_id };
    }
    if (status === 1 || status === '1') {
      return { ok: true, status: 1, message: data.message || 'Nạp thẻ thành công!', request_id };
    }

    const msg = data.message || data.data?.msg || data.msg || 'Thẻ không hợp lệ hoặc đã sử dụng.';
    return { ok: false, status: 2, error: msg };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi mạng: ' + (err.message || 'không xác định') };
  }
}
