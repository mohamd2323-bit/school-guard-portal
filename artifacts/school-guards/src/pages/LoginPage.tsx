import { useState } from "react";
import { Shield, LogIn, Eye, EyeOff, Clock } from "lucide-react";
import { useUsers } from "../store/useUsers";
import { IDLE_LOGOUT_MSG_KEY } from "../App";

export default function LoginPage() {
  const { login } = useUsers();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [idleMsg] = useState(() => {
    try {
      const msg = sessionStorage.getItem(IDLE_LOGOUT_MSG_KEY) ?? "";
      if (msg) sessionStorage.removeItem(IDLE_LOGOUT_MSG_KEY);
      return msg;
    } catch {
      return "";
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      if (!user) setError("اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب معطّل");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      dir="rtl"
      style={{ background: "linear-gradient(135deg, hsl(174 65% 18%) 0%, hsl(174 65% 32%) 100%)" }}
    >
      {/* Ministry header */}
      <div className="text-center mb-8 text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <p className="text-white/70 text-xs font-medium tracking-wide mb-0.5">وزارة التعليم</p>
        <h1 className="text-xl font-bold leading-tight">إدارة الأمن والسلامة</h1>
        <p className="text-white/60 text-sm mt-1">تعليم عسير — نظام إدارة الحراسات المدرسية</p>
      </div>

      {/* Idle timeout banner */}
      {idleMsg && (
        <div className="w-full max-w-sm mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3 shadow">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium leading-snug">{idleMsg}</p>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <h2 className="text-base font-bold text-center text-gray-800 mb-6">تسجيل الدخول</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              اسم المستخدم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              dir="ltr"
              autoComplete="username"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 font-mono transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                autoComplete="current-password"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 font-mono transition-colors pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "hsl(174 65% 28%)" }}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {submitting ? "جارٍ التحقق…" : "دخول"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-white/40 text-xs">نظام إدارة الحراسات المدرسية — إدارة الأمن والسلامة</p>
    </div>
  );
}
