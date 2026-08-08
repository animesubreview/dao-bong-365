import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

export default function Dmca() {
  useSEO({
    title: 'Bảo Vệ DMCA',
    description: 'Thông tin về chính sách bản quyền DMCA của Phim Tuổi Thơ - tổng hợp phim hoạt hình từ nhiều nguồn.',
    url: '/dmca',
  });

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 px-4 md:px-8" style={{ paddingTop: '84px' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-white">Bảo Vệ DMCA</h1>
        <span className="block w-16 h-1 rounded-full bg-yellow-400 mt-2 mb-8" />

        <img src="/assets/logo-phimtuoitho.png" alt="Phim Tuổi Thơ" className="h-12 w-auto object-contain mb-6" />

        <div className="space-y-5 text-slate-300 text-[15px] leading-relaxed">
          <p>
            Liên hệ <span className="font-bold text-white">Phim Tuổi Thơ</span> — trang tổng hợp phim hoạt hình,
            anime từ nhiều nguồn khác nhau trên internet.
          </p>

          <p>
            Toàn bộ nội dung video hiển thị trên <span className="text-yellow-400 font-semibold">Phim Tuổi Thơ</span> không
            được lưu trữ trên máy chủ của chúng tôi và cũng không do chúng tôi tạo ra hay tải lên. Phim Tuổi Thơ chỉ
            đơn thuần hoạt động như một công cụ tổng hợp, liên kết tới video từ các nền tảng và nhà cung cấp bên thứ
            ba. Chúng tôi không chịu trách nhiệm về nội dung được lưu trữ trên các trang web bên ngoài đó.
          </p>

          <p>
            Nếu bạn là chủ sở hữu bản quyền và phát hiện nội dung vi phạm quyền của mình, vui lòng liên hệ trực tiếp
            với máy chủ lưu trữ nội dung đó để yêu cầu gỡ bỏ. Sau khi nội dung gốc bị gỡ, đường liên kết trên Phim
            Tuổi Thơ cũng sẽ ngừng hoạt động.
          </p>

          <p>
            Việc truy cập và sử dụng website đồng nghĩa với việc bạn đã đọc và chấp nhận các điều khoản sử dụng cũng
            như chính sách khiếu nại bản quyền của chúng tôi. Xem thêm tại{' '}
            <Link to="/chinh-sach-bao-mat" className="text-yellow-400 font-semibold hover:underline">
              Chính Sách Bảo Mật
            </Link>.
          </p>

          <p className="text-slate-500 text-sm">
            Phim Tuổi Thơ hiện đang trong giai đoạn hoạt động thử nghiệm (Beta).
          </p>

          <p className="text-slate-500 text-sm border-t border-slate-800 pt-5">
            <span className="font-bold text-slate-400">Tuyên bố miễn trừ trách nhiệm:</span> Website này không lưu
            trữ bất kỳ tệp tin nào trên máy chủ của mình. Toàn bộ nội dung được cung cấp bởi bên thứ ba không có
            liên kết trực tiếp với chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}
