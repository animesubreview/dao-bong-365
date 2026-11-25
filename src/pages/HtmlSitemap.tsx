import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const TYPES = [
  { label: 'Phim Bộ', value: 'phim-bo' },
  { label: 'Phim Lẻ', value: 'phim-le' },
  { label: 'Hoạt Hình / Anime', value: 'hoat-hinh' },
  { label: 'Phim Chiếu Rạp', value: 'phim-chieu-rap' },
  { label: 'TV Shows', value: 'tv-shows' },
];

const CATEGORIES = [
  { label: 'Hành Động', value: 'hanh-dong' }, { label: 'Tình Cảm', value: 'tinh-cam' },
  { label: 'Hài Hước', value: 'hai-huoc' }, { label: 'Cổ Trang', value: 'co-trang' },
  { label: 'Tâm Lý', value: 'tam-ly' }, { label: 'Hình Sự', value: 'hinh-su' },
  { label: 'Kinh Dị', value: 'kinh-di' }, { label: 'Viễn Tưởng', value: 'vien-tuong' },
  { label: 'Phiêu Lưu', value: 'phieu-luu' }, { label: 'Thần Thoại', value: 'than-thoai' },
  { label: 'Chiến Tranh', value: 'chien-tranh' }, { label: 'Thể Thao', value: 'the-thao' },
  { label: 'Khoa Học', value: 'khoa-hoc' }, { label: 'Âm Nhạc', value: 'am-nhac' },
  { label: 'Kinh Điển', value: 'kinh-dien' }, { label: 'Gia Đình', value: 'gia-dinh' },
];

const COUNTRIES = [
  { label: 'Hàn Quốc', value: 'han-quoc' }, { label: 'Trung Quốc', value: 'trung-quoc' },
  { label: 'Âu Mỹ', value: 'au-my' }, { label: 'Nhật Bản', value: 'nhat-ban' },
  { label: 'Thái Lan', value: 'thai-lan' }, { label: 'Việt Nam', value: 'viet-nam' },
  { label: 'Đài Loan', value: 'dai-loan' }, { label: 'Hồng Kông', value: 'hong-kong' },
  { label: 'Ấn Độ', value: 'an-do' }, { label: 'Anh', value: 'anh' },
  { label: 'Pháp', value: 'phap' }, { label: 'Đức', value: 'duc' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Pill({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-green-600 text-slate-200 hover:text-white text-sm transition-colors"
    >
      {label}
    </Link>
  );
}

export default function HtmlSitemap() {
  useSEO({
    title: 'Sơ Đồ Trang Web (Sitemap)',
    description: 'Toàn bộ chuyên mục phim bộ, phim lẻ, hoạt hình, thể loại và quốc gia tại Đảo Phim.',
    url: '/site-map',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Sơ Đồ Trang Web</h1>

      <Section title="Chuyên mục">
        <Pill to="/" label="Trang chủ" />
        {TYPES.map((t) => (
          <Pill key={t.value} to={`/type/${t.value}`} label={t.label} />
        ))}
        <Pill to="/truyen-tranh" label="Truyện Tranh" />
        <Pill to="/cinema" label="Lịch Chiếu Rạp" />
      </Section>

      <Section title="Thể loại phim">
        {CATEGORIES.map((c) => (
          <Pill key={c.value} to={`/type/phim-bo?category=${c.value}`} label={c.label} />
        ))}
      </Section>

      <Section title="Quốc gia">
        {COUNTRIES.map((c) => (
          <Pill key={c.value} to={`/type/phim-bo?country=${c.value}`} label={c.label} />
        ))}
      </Section>
    </div>
  );
}
