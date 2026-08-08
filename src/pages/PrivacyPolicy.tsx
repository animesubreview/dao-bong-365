import { useSEO } from '../hooks/useSEO';

export default function PrivacyPolicy() {
  useSEO({
    title: 'Chính Sách Bảo Mật',
    description: 'Chính sách bảo mật thông tin người dùng của Phim Tuổi Thơ.',
    url: '/chinh-sach-bao-mat',
  });

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 px-4 md:px-8" style={{ paddingTop: '84px' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-white">Chính Sách Bảo Mật</h1>
        <span className="block w-16 h-1 rounded-full bg-yellow-400 mt-2 mb-8" />

        <div className="space-y-5 text-slate-300 text-[15px] leading-relaxed">
          <p>
            <span className="font-bold text-white">Phim Tuổi Thơ</span> tôn trọng quyền riêng tư của người dùng.
            Chính sách này giải thích chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn như thế nào khi truy
            cập website.
          </p>

          <div>
            <h2 className="text-white font-bold mb-1.5">1. Thông tin chúng tôi thu thập</h2>
            <p>
              Khi bạn tạo tài khoản, chúng tôi có thể thu thập email, tên hiển thị và lịch sử xem phim để cải thiện
              trải nghiệm gợi ý nội dung. Chúng tôi cũng có thể ghi nhận một số dữ liệu kỹ thuật ẩn danh (loại trình
              duyệt, thiết bị) phục vụ mục đích thống kê.
            </p>
          </div>

          <div>
            <h2 className="text-white font-bold mb-1.5">2. Mục đích sử dụng</h2>
            <p>
              Thông tin thu thập được dùng để vận hành, duy trì và cải thiện dịch vụ, đề xuất phim phù hợp, đồng bộ
              lịch sử xem giữa các thiết bị, và liên hệ khi cần thiết. Chúng tôi không bán thông tin cá nhân của bạn
              cho bên thứ ba.
            </p>
          </div>

          <div>
            <h2 className="text-white font-bold mb-1.5">3. Cookie</h2>
            <p>
              Website có thể sử dụng cookie để ghi nhớ phiên đăng nhập, tiến độ xem phim và một số tuỳ chọn hiển thị.
              Bạn có thể tắt cookie trong trình duyệt, tuy nhiên một số tính năng có thể không hoạt động như mong
              muốn.
            </p>
          </div>

          <div>
            <h2 className="text-white font-bold mb-1.5">4. Nội dung bên thứ ba</h2>
            <p>
              Phim Tuổi Thơ tổng hợp liên kết phim từ các nguồn/nhà cung cấp video bên thứ ba. Chúng tôi không lưu
              trữ file phim trên máy chủ của mình và không chịu trách nhiệm về nội dung, quảng cáo hiển thị trên các
              nền tảng bên ngoài đó.
            </p>
          </div>

          <div>
            <h2 className="text-white font-bold mb-1.5">5. Liên hệ</h2>
            <p>
              Nếu bạn có thắc mắc về chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua email hỗ trợ hoặc
              fanpage được công bố trên website.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
