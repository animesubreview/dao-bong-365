// ─── API Check Lịch sử Nhận Tiền ─────────────────────────────────────────────

export type WalletApiProvider = 'gachthefast' | 'doithe1s';

export interface WalletReceiveRecord {
  order_code: string;
  pay_amount: string;
  message: string;
  created_at: string;
}

export interface WalletReceiveConfig {
  provider?: WalletApiProvider;   // mặc định 'gachthefast'
  domain: string;                 // gachthefast: domain site; doithe1s: để 'doithe1s.vn'
  partner_id: string;
  partner_key: string;
  limit?: number;
}

export interface WalletReceiveResponse {
  ok: boolean;
  data?: WalletReceiveRecord[];
  error?: string;
  debug?: any;
}

// ─── GachTheFast ─────────────────────────────────────────────────────────────
export async function fetchWalletReceiveHistory(
  config: WalletReceiveConfig
): Promise<WalletReceiveResponse> {
  const provider = config.provider ?? 'gachthefast';

  if (provider === 'doithe1s') {
    return fetchDoithe1sHistory(config);
  }
  return fetchGachTheFastHistory(config);
}

async function fetchGachTheFastHistory(
  config: WalletReceiveConfig
): Promise<WalletReceiveResponse> {
  try {
    const res = await fetch('/.netlify/functions/wallet-receive-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider:    'gachthefast',
        domain:      config.domain,
        partner_id:  config.partner_id,
        partner_key: config.partner_key,
        limit:       config.limit ?? 100,
      }),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Netlify function lỗi (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }

    if (!res.ok) {
      const errMsg = data.error || data.message || `HTTP ${res.status}`;
      return { ok: false, error: errMsg, debug: data.debug };
    }

    if (data.status === 'success' || data.status === 1 || data.status === '1') {
      return { ok: true, data: (data.data || data.histories || data.list || []) as WalletReceiveRecord[] };
    }

    const errMsg = data.message || data.msg || data.error || 'Lỗi từ API nhận tiền.';
    return { ok: false, error: errMsg, debug: data };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi mạng: ' + (err.message || 'không xác định') };
  }
}

// ─── DoiThe1s ────────────────────────────────────────────────────────────────
async function fetchDoithe1sHistory(
  config: WalletReceiveConfig
): Promise<WalletReceiveResponse> {
  try {
    const res = await fetch('/.netlify/functions/wallet-receive-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider:    'doithe1s',
        partner_id:  config.partner_id,
        partner_key: config.partner_key,
        limit:       config.limit ?? 100,
      }),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Netlify function lỗi (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }

    if (!res.ok) {
      const errMsg = data.error || data.message || `HTTP ${res.status}`;
      return { ok: false, error: errMsg, debug: data.debug };
    }

    // DoiThe1s trả về status: 1 hoặc "success"
    if (data.status === 1 || data.status === '1' || data.status === 'success') {
      const raw: any[] = data.data || data.list || data.histories || [];
      // Chuẩn hoá field về dạng WalletReceiveRecord
      const records: WalletReceiveRecord[] = raw.map((item: any) => ({
        order_code: String(item.request_id  ?? item.order_code  ?? item.trans_id ?? ''),
        pay_amount: String(item.amount      ?? item.pay_amount  ?? item.value    ?? '0'),
        message:    item.message ?? item.note ?? `${item.telco ?? ''} ${item.serial ?? ''}`.trim(),
        created_at: item.created_at ?? item.time ?? item.date ?? '',
      }));
      return { ok: true, data: records };
    }

    const errMsg = data.message || data.msg || data.error || 'Lỗi từ DoiThe1s API.';
    return { ok: false, error: errMsg, debug: data };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi mạng: ' + (err.message || 'không xác định') };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function formatReceiveAmount(amount: string | number): string {
  const n = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  if (isNaN(n)) return amount + '₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function formatReceiveDate(dateStr: string): string {
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}
