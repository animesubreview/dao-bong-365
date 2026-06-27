import { useSEO } from '../hooks/useSEO';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Clapperboard, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { register, login, onAuthChange } from '../lib/auth';

type Tab = 'login' | 'register';

function InputField({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  rightSlot,
}: {
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        <Icon size={17} />
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/40 transition-all"
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

export default function AuthPage() {
  useSEO({ noIndex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab: Tab = (location.state as any)?.tab || 'login';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Login state
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(user => {
      if (user) navigate('/', { replace: true });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginId || !loginPass) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true);
    const result = await login(loginId.trim(), loginPass);
    setLoading(false);
    if (result.ok) {
      const from = (location.state as any)?.from || '/';
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPass !== regPassConfirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    const result = await register(regUsername.trim(), regEmail.trim(), regPass);
    setLoading(false);
    if (result.ok) {
      setSuccess('Đăng ký thành công! Chào mừng ' + regUsername + ' 🎉');
      setTimeout(() => navigate('/'), 1200);
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background blur blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-sky-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Về trang chủ
        </Link>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-sky-500/20">
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
                    ? 'bg-sky-500 text-slate-950 shadow-md'
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
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <InputField
                icon={User}
                placeholder="Tên tài khoản hoặc Email"
                value={loginId}
                onChange={setLoginId}
              />
              <InputField
                icon={Lock}
                type={showLoginPass ? 'text' : 'password'}
                placeholder="Mật khẩu"
                value={loginPass}
                onChange={setLoginPass}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(v => !v)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-60 text-sm mt-1"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
              <p className="text-center text-slate-500 text-sm">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => setTab('register')} className="text-sky-400 font-bold hover:underline">
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <InputField
                icon={User}
                placeholder="Tên tài khoản (tối thiểu 3 ký tự)"
                value={regUsername}
                onChange={setRegUsername}
              />
              <InputField
                icon={Mail}
                type="email"
                placeholder="Địa chỉ Email"
                value={regEmail}
                onChange={setRegEmail}
              />
              <InputField
                icon={Lock}
                type={showRegPass ? 'text' : 'password'}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                value={regPass}
                onChange={setRegPass}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowRegPass(v => !v)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <InputField
                icon={Lock}
                type="password"
                placeholder="Xác nhận mật khẩu"
                value={regPassConfirm}
                onChange={setRegPassConfirm}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-60 text-sm mt-1"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </button>
              <p className="text-center text-slate-500 text-sm">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => setTab('login')} className="text-sky-400 font-bold hover:underline">
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
