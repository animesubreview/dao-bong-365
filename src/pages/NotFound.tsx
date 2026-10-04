import { Link } from 'react-router-dom';
import { Home, Search, Film } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export default function NotFound() {
  useSEO({
    title: 'Không Tìm Thấy Trang (404)',
    description: 'Trang bạn tìm không tồn tại hoặc đã bị xoá. Quay lại trang chủ Đảo Phim để tiếp tục xem phim online miễn phí HD.',
    noIndex: true,
  });

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <p className="text-7xl md:text-8xl font-black text-green-500 mb-2">404</p>
      <h1 className="text-xl md:text-2xl font-bold text-white mb-3">
        Rất tiếc, không tìm thấy trang này
      </h1>
      <p className="text-slate-400 max-w-md mb-8">
        Trang bạn yêu cầu có thể đã bị xoá, đổi tên hoặc chưa từng tồn tại. Hãy thử quay lại
        trang chủ hoặc tìm phim bạn muốn xem bên dưới.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
        >
          <Home size={18} /> Về trang chủ
        </Link>
        <Link
          to="/search"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
        >
          <Search size={18} /> Tìm phim
        </Link>
        <Link
          to="/type/phim-bo"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
        >
          <Film size={18} /> Phim bộ mới
        </Link>
      </div>
    </div>
  );
}
