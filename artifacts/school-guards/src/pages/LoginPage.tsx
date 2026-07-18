import { useState } from "react";
import { Clock, Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { IDLE_LOGOUT_MSG_KEY } from "../App";
import { useUsers } from "../store/useUsers";
import moeLogo from "../assets/images/moe-logo.png";

function TechShield() {
  const nodes = [
    [95, 95], [150, 112], [214, 92], [278, 118], [330, 92], [384, 112],
    [112, 172], [184, 158], [248, 182], [316, 162], [398, 178],
    [132, 246], [204, 240], [266, 276], [344, 238], [420, 260],
    [154, 330], [232, 350], [300, 322], [374, 354],
  ];

  return (
    <svg viewBox="0 0 520 520" className="h-[410px] w-[410px] max-w-[42vw] opacity-95" aria-hidden="true">
      <defs>
        <filter id="shield-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M260 42 C318 84 382 85 442 84 C448 205 428 318 260 454 C92 318 72 205 78 84 C138 85 202 84 260 42Z"
        fill="rgba(20,184,166,0.04)"
        stroke="#21d7cd"
        strokeWidth="2"
        filter="url(#shield-glow)"
      />
      <path
        d="M260 70 C306 103 358 108 410 106 C414 205 388 300 260 420 C132 300 106 205 110 106 C162 108 214 103 260 70Z"
        fill="none"
        stroke="#2dd4bf"
        strokeOpacity="0.65"
        strokeWidth="1.2"
      />
      {nodes.map(([x1, y1], i) =>
        nodes.slice(i + 1, i + 4).map(([x2, y2], j) => (
          <line
            key={`${i}-${j}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#18c9c3"
            strokeOpacity="0.28"
            strokeWidth="0.8"
          />
        ))
      )}
      {nodes.map(([x, y], index) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={index % 5 === 0 ? 6 : index % 3 === 0 ? 4 : 2.6}
          fill="#36ded5"
          opacity={0.9}
        />
      ))}
      {Array.from({ length: 64 }).map((_, index) => (
        <circle
          key={index}
          cx={88 + ((index * 47) % 380)}
          cy={58 + ((index * 83) % 340)}
          r={index % 7 === 0 ? 2 : 1.15}
          fill="#39fff5"
          opacity={index % 5 === 0 ? 0.75 : 0.42}
        />
      ))}
    </svg>
  );
}

function WaveDots() {
  return (
    <svg viewBox="0 0 440 140" className="pointer-events-none absolute bottom-0 left-0 h-36 w-full text-teal-500/20" aria-hidden="true">
      {Array.from({ length: 150 }).map((_, index) => {
        const x = (index % 25) * 18;
        const row = Math.floor(index / 25);
        const y = 72 + row * 12 + Math.sin((x + row * 20) / 38) * 18;
        return <circle key={index} cx={x} cy={y} r={1.25 + (row % 2) * 0.4} fill="currentColor" />;
      })}
    </svg>
  );
}

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
    <div className="min-h-screen overflow-hidden bg-[#002c31] text-[#0d8d7e]" dir="rtl">
      <div className="grid min-h-screen lg:grid-cols-[468px_1fr]" dir="ltr">
        <section className="relative flex min-h-screen flex-col items-center bg-white px-6 pb-12 pt-[132px] text-center shadow-[10px_0_40px_rgba(0,0,0,0.08)] sm:px-12" dir="rtl">
          <div className="flex w-full max-w-[280px] flex-col items-center sm:max-w-[364px]">
            <img
              src={moeLogo}
              alt="شعار وزارة التعليم"
              className="h-[184px] w-[320px] max-w-full object-contain"
              draggable={false}
            />
            <p className="mt-7 text-[22px] font-bold text-[#0a8b78]">بوابة الحراسات المدرسية</p>

            <div className="mt-16 w-full">
              <h3 className="mb-4 text-[22px] font-bold text-[#0a8b78]">تسجيل الدخول</h3>

              {idleMsg && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p className="font-medium leading-snug">{idleMsg}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-[22px]">
                <div className="relative">
                  <User className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7b868d]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    dir="rtl"
                    autoComplete="username"
                    required
                    className="h-[56px] w-full rounded-[10px] border border-[#cfd8dd] bg-white pr-12 pl-4 text-right text-[13px] font-medium text-[#1f2933] outline-none transition-colors placeholder:text-[#7f8990] focus:border-[#0a9a86] focus:ring-2 focus:ring-[#0a9a86]/15"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7b868d]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    dir="rtl"
                    autoComplete="current-password"
                    required
                    className="h-[56px] w-full rounded-[10px] border border-[#cfd8dd] bg-white pr-12 pl-12 text-right text-[13px] font-medium text-[#1f2933] outline-none transition-colors placeholder:text-[#7f8990] focus:border-[#0a9a86] focus:ring-2 focus:ring-[#0a9a86]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute left-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#7b868d] hover:bg-slate-100 hover:text-[#0a8b78]"
                    tabIndex={-1}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !username.trim() || !password}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#009985] text-[17px] font-bold text-white shadow-[0_12px_26px_rgba(0,153,133,0.22)] transition-colors hover:bg-[#008876] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {submitting ? "جاري التحقق..." : "تسجيل الدخول"}
                </button>
              </form>

              <button type="button" className="mt-4 text-[13px] font-medium text-[#0a8b78] hover:text-[#006f61]">
                نسيت كلمة المرور؟
              </button>
            </div>
          </div>
          <WaveDots />
        </section>

        <section className="relative hidden min-h-screen overflow-hidden bg-[#002f35] text-white lg:block" dir="rtl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_66%_42%,rgba(20,184,166,0.18),transparent_28%),radial-gradient(circle_at_35%_52%,rgba(6,95,92,0.35),transparent_30%),linear-gradient(135deg,#002a2f_0%,#00383e_46%,#01262b_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:repeating-radial-gradient(circle_at_70%_42%,transparent_0,transparent_48px,rgba(45,212,191,0.18)_49px,transparent_50px)]" />

          <div className="relative z-10 flex min-h-screen items-center" dir="ltr">
            <div className="ml-[74px] mt-[-18px] max-w-[720px] text-center" dir="rtl">
              <img
                src={moeLogo}
                alt="شعار وزارة التعليم"
                className="mx-auto h-[178px] w-[338px] object-contain"
                draggable={false}
              />
              <h1 className="mt-[76px] whitespace-nowrap text-[56px] font-extrabold leading-tight tracking-normal text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.28)] xl:text-[64px]">
                بوابة الحراسات المدرسية
              </h1>
              <p className="mt-7 max-w-[640px] text-center text-[25px] font-medium leading-[1.9] text-white/78">
                نظام موحد لإدارة الحراسات المدرسية ومتابعة الاحتياج والبلاغات والعمليات.
              </p>
            </div>

            <div className="absolute right-[7%] top-1/2 -translate-y-1/2">
              <TechShield />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
