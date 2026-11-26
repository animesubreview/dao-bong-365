import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, UserPlus, Clapperboard, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { AuthStyles, FloatField, MorphButton } from '../components/AuthFields';
import { register, login, onAuthChange, getUserProfile } from '../lib/auth';

type Tab = 'login' | 'register';

export default function AuthPage() {
  useSEO({ noIndex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab: Tab = (location.state as any)?.tab || 'login';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Login state
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [btn, setBtn] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [fe, setFe] = useState<Record<string, string>>({}); // lỗi theo từng ô
  const [shake, setShake] = useState(0);
  const flagErr = (errs: Record<string, string>) => { setFe(errs); setShake(n => n + 1); };

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) return;
      await getUserProfile(user.uid); // tự tạo hồ sơ nếu thiếu, tránh kẹt vòng lặp đăng nhập ↔ trang chủ
      navigate('/', { replace: true });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setError(''); setSuccess(''); setFe({}); setBtn('idle');
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (btn !== 'idle') return;
    setError(''); setFe({});
    const errs: Record<string, string> = {};
    if (!loginId.trim()) errs.id = 'Nhập tên tài khoản hoặc email';
    if (!loginPass) errs.pass = 'Nhập mật khẩu';
    if (Object.keys(errs).length) { flagErr(errs); return; }
    setBtn('busy');
    const result = await login(loginId.trim(), loginPass);
    if (result.ok) {
      setBtn('ok');
      const from = (location.state as any)?.from || '/';
      setTimeout(() => navigate(from, { replace: true }), 700);
    } else {
      setBtn('idle');
      setError(result.error || 'Đăng nhập thất bại');
      flagErr({ pass: ' ' }); // rung ô mật khẩu
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (btn !== 'idle') return;
    setError(''); setFe({});
    const errs: Record<string, string> = {};
    if (regUsername.trim().length < 3) errs.user = 'Tên tài khoản tối thiểu 3 ký tự';
    if (!/\S+@\S+\.\S+/.test(regEmail.trim())) errs.email = 'Email chưa đúng định dạng';
    if (regPass.length < 6) errs.pass = 'Mật khẩu tối thiểu 6 ký tự';
    if (regPass !== regPassConfirm) errs.confirm = 'Mật khẩu xác nhận không khớp';
    if (Object.keys(errs).length) { flagErr(errs); return; }
    setBtn('busy');
    const result = await register(regUsername.trim(), regEmail.trim(), regPass);
    if (result.ok) {
      setBtn('ok');
      setSuccess('Đăng ký thành công! Chào mừng ' + regUsername + ' 🎉');
      setTimeout(() => navigate('/'), 1400);
    } else {
      setBtn('idle');
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background blur blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Về trang chủ
        </Link>

        <AuthStyles />
        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-green-500/20">
              <Clapperboard size={26} className="text-slate-950" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">ĐẢO PHIM</h1>
            <p className="text-slate-500 text-sm mt-1">Xem phim không giới hạn</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-6">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  tab === t
                    ? 'bg-green-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm mb-4">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm mb-4">
              <Check size={15} className="shrink-0" /> {success}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-1">
              <FloatField label="Tên tài khoản hoặc Email" value={loginId} onChange={setLoginId} autoComplete="username" error={fe.id} shake={shake} />
              <FloatField label="Mật khẩu" type="password" value={loginPass} onChange={setLoginPass} autoComplete="current-password" error={fe.pass} shake={shake} />
              <MorphButton state={btn}>Đăng nhập</MorphButton>
              <p className="text-center text-slate-500 text-sm mt-3">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => setTab('register')} className="text-green-400 font-bold hover:underline">
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} noValidate className="flex flex-col gap-1">
              <FloatField label="Tên tài khoản (tối thiểu 3 ký tự)" value={regUsername} onChange={setRegUsername} autoComplete="username" maxLength={30} error={fe.user} shake={shake} />
              <FloatField label="Địa chỉ Email" type="email" value={regEmail} onChange={setRegEmail} autoComplete="email" error={fe.email} shake={shake} />
              <FloatField label="Mật khẩu (tối thiểu 6 ký tự)" type="password" value={regPass} onChange={setRegPass} autoComplete="new-password" error={fe.pass} shake={shake} />
              <FloatField label="Xác nhận mật khẩu" type="password" value={regPassConfirm} onChange={setRegPassConfirm} autoComplete="new-password" error={fe.confirm} shake={shake} />
              <MorphButton state={btn}>Tạo tài khoản</MorphButton>
              <p className="text-center text-slate-500 text-sm mt-3">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => setTab('login')} className="text-green-400 font-bold hover:underline">
                  Đăng nhập
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          © ĐẢO PHIM · Xem phim miễn phí
        </p>
      </div>
    </div>
  );
}
