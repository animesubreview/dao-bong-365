import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { usePageTitle } from '../lib/utils';

interface Section { h: string; p: string[]; }
interface PageContent { title: string; intro: string; sections: Section[]; }

const CONTENT: Record<string, PageContent> = {
  faq: {
    title: 'Câu hỏi thường gặp',
    intro: 'Một số thắc mắc phổ biến khi sử dụng Đảo Phim.',
    sections: [
      { h: 'Xem phim trên Đảo Phim có mất phí không?', p: ['Toàn bộ nội dung trên Đảo Phim hiện miễn phí. Bạn có thể tạo tài khoản để lưu lịch sử xem, danh sách yêu thích và đồng bộ giữa các thiết bị, nhưng việc xem phim không bắt buộc phải đăng nhập.'] },
      { h: 'Vì sao video bị lag hoặc không tải được?', p: ['Thử đổi sang server khác ngay trong trang xem phim, kiểm tra lại kết nối mạng, hoặc tải lại trang. Nếu tình trạng vẫn tiếp diễn ở nhiều phim khác nhau, hãy phản hồi cho chúng tôi qua mục Liên hệ bên dưới.'] },
      { h: 'Làm sao để báo lỗi link phim hỏng?', p: ['Bạn có thể gửi tên phim và tập bị lỗi qua email hoặc Telegram ở phần Liên hệ cuối trang. Đội ngũ sẽ kiểm tra và cập nhật lại nguồn phát trong thời gian sớm nhất.'] },
      { h: 'Đảo Phim có ứng dụng di động không?', p: ['Hiện tại Đảo Phim chạy dưới dạng website, tối ưu cho cả điện thoại và máy tính. Bạn có thể thêm trang vào màn hình chính trên trình duyệt để dùng như một ứng dụng.'] },
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật',
    intro: 'Đảo Phim tôn trọng quyền riêng tư của người dùng. Trang này giải thích những thông tin chúng tôi thu thập và cách sử dụng.',
    sections: [
      { h: 'Thông tin thu thập', p: ['Khi bạn tạo tài khoản, chúng tôi lưu tên đăng nhập/email và mật khẩu đã mã hoá. Chúng tôi cũng lưu lịch sử xem, danh sách yêu thích và tiến độ xem phim để phục vụ chính trải nghiệm của bạn trên trang.'] },
      { h: 'Cookie và lưu trữ cục bộ', p: ['Đảo Phim dùng cookie/localStorage để ghi nhớ phiên đăng nhập, tuỳ chọn hiển thị và tiến độ xem phim ngay trên trình duyệt của bạn.'] },
      { h: 'Chia sẻ với bên thứ ba', p: ['Chúng tôi không bán hay trao đổi dữ liệu cá nhân của người dùng cho bên thứ ba nhằm mục đích quảng cáo. Một số server phát video được nhúng từ nguồn bên ngoài; khi phát, trình duyệt của bạn có thể kết nối trực tiếp tới các nguồn đó theo cách thông thường của một video nhúng.'] },
      { h: 'Quyền của bạn', p: ['Bạn có thể yêu cầu xoá tài khoản và dữ liệu liên quan bất cứ lúc nào bằng cách liên hệ với chúng tôi qua email ở cuối trang.'] },
    ],
  },
  terms: {
    title: 'Điều khoản sử dụng',
    intro: 'Khi truy cập và sử dụng Đảo Phim, bạn đồng ý với các điều khoản dưới đây.',
    sections: [
      { h: 'Nội dung trên trang', p: ['Đảo Phim tổng hợp và hiển thị nội dung phim từ các nguồn phát trực tuyến sẵn có trên Internet nhằm mục đích giải trí phi thương mại. Chúng tôi không lưu trữ file phim trên máy chủ riêng.'] },
      { h: 'Trách nhiệm người dùng', p: ['Người dùng cam kết không sử dụng trang để thực hiện hành vi vi phạm pháp luật, phát tán mã độc, spam hoặc quấy rối người dùng khác trong phần bình luận/chat.'] },
      { h: 'Tài khoản', p: ['Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình. Đảo Phim có quyền khoá tài khoản vi phạm điều khoản sử dụng mà không cần báo trước.'] },
      { h: 'Thay đổi điều khoản', p: ['Điều khoản này có thể được cập nhật theo thời gian. Phiên bản mới nhất luôn được đăng tải công khai tại trang này.'] },
    ],
  },
};

export default function InfoPage() {
  const { type = 'faq' } = useParams<{ type: string }>();
  const content = CONTENT[type] || CONTENT.faq;
  usePageTitle(content.title);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-4">
        <ChevronLeft size={16} /> Về trang chủ
      </Link>
      <h1 className="text-2xl font-black text-white mb-2">{content.title}</h1>
      <p className="text-slate-400 text-sm mb-8 leading-relaxed">{content.intro}</p>

      <div className="flex flex-col gap-6">
        {content.sections.map(s => (
          <div key={s.h}>
            <h2 className="text-white font-bold text-base mb-1.5">{s.h}</h2>
            {s.p.map((line, i) => (
              <p key={i} className="text-slate-400 text-sm leading-relaxed">{line}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
