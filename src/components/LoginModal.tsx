import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogIn, UserPlus, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'login' | 'register';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, register, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const switchTab = (t: Tab) => {
    reset();
    setTab(t);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await login(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      reset();
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।');
      return;
    }
    setLoading(true);
    const { error } = await register(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess('Registration সফল! আপনার email confirm করুন, তারপর login করুন।');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const { error } = await loginWithGoogle();
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto rounded-2xl border border-yellow-500/30 bg-gray-900 shadow-2xl shadow-yellow-500/10 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Trading Bangla</h2>
                      <p className="text-xs text-gray-400">সব সিগন্যাল ও EA data দেখুন</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 p-1 mb-5">
                  <button
                    onClick={() => switchTab('login')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                      tab === 'login'
                        ? 'bg-yellow-500 text-gray-900 shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login
                  </button>
                  <button
                    onClick={() => switchTab('register')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                      tab === 'register'
                        ? 'bg-yellow-500 text-gray-900 shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </button>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-all mb-4 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google দিয়ে {tab === 'register' ? 'Sign Up' : 'Login'} করুন
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-xs text-gray-500">অথবা email দিয়ে</span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>

                {/* Login Form */}
                <AnimatePresence mode="wait">
                  {tab === 'login' ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      onSubmit={handleLogin}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setError(''); }}
                          placeholder="your@email.com"
                          required
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            placeholder="••••••••"
                            required
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                          >
                            {error}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2.5 font-bold text-sm text-gray-900 hover:from-yellow-400 hover:to-amber-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
                      >
                        {loading ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <LogIn className="w-4 h-4" />
                        )}
                        {loading ? 'Logging in...' : 'Login করুন'}
                      </button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      onSubmit={handleRegister}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => { setName(e.target.value); setError(''); }}
                          placeholder="আপনার নাম"
                          required
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setError(''); }}
                          placeholder="your@email.com"
                          required
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            placeholder="কমপক্ষে ৬ অক্ষর"
                            required
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                          placeholder="পাসওয়ার্ড আবার দিন"
                          required
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                        />
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                          >
                            {error}
                          </motion.p>
                        )}
                        {success && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                          >
                            {success}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        disabled={loading || !!success}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2.5 font-bold text-sm text-gray-900 hover:from-yellow-400 hover:to-amber-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
                      >
                        {loading ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        {loading ? 'Creating account...' : 'Account তৈরি করুন'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
