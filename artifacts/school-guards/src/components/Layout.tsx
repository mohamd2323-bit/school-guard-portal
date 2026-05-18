import { Link, useLocation } from "wouter";
import { useSaveError } from "../store/useStore";
import {
  LayoutDashboard,
  ShieldCheck,
  School,
  Database,
  ClipboardList,
  Headphones,
  Settings2,
  AlertTriangle,
  Menu,
  X,
  Users,
  LogIn,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { useUsers } from "../store/useUsers";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/guards", label: "إدارة الحراس", icon: ShieldCheck },
  { href: "/schools", label: "إدارة المدارس", icon: School },
  { href: "/needs", label: "الاحتياج", icon: ClipboardList },
  { href: "/operations", label: "إدارة العمليات", icon: Settings2 },
  { href: "/violations", label: "المخالفات", icon: AlertTriangle },
  { href: "/tickets", label: "بلاغات الدعم الموحد", icon: Headphones },
  { href: "/data", label: "إدارة البيانات", icon: Database },
  { href: "/users", label: "صلاحيات الموظفين", icon: Users },
];

function SaveErrorBanner() {
  const { error, dismiss } = useSaveError();
  if (!error) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-3 text-sm text-red-700" dir="rtl">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
      <span className="flex-1">{error}</span>
      <button onClick={dismiss} className="flex-shrink-0 hover:text-red-900" aria-label="إغلاق">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, logout } = useUsers();

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 w-64 flex flex-col
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:static lg:flex
        `}
        style={{ background: "hsl(174 65% 28%)" }}
      >
        {/* Logo */}
        <div className="flex items-start gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[10px] font-medium leading-tight">وزارة التعليم</p>
            <p className="text-white font-bold text-xs leading-snug mt-0.5">إدارة الأمن والسلامة</p>
            <p className="text-white/80 text-[10px] leading-tight mt-0.5">الأمن المدرسي — تعليم عسير</p>
          </div>
          <button className="lg:hidden text-white/70 hover:text-white flex-shrink-0" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? location === "/" || location === ""
                : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer — current user widget */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate leading-tight">{currentUser.name}</p>
                  <p className="text-white/60 text-[10px] leading-tight truncate">{currentUser.role}</p>
                </div>
              </div>
              <button onClick={logout}
                title="تسجيل خروج"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0">
                <LogIn className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          ) : (
            <Link href="/users"
              className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors"
              onClick={() => setMobileOpen(false)}>
              <Crown className="w-3.5 h-3.5" />
              تسجيل الدخول
            </Link>
          )}
          <p className="text-white/30 text-[10px] text-center pt-1">نظام إدارة الحراسات المدرسية</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted text-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">
            {navItems.find((n) =>
              n.href === "/"
                ? location === "/" || location === ""
                : location.startsWith(n.href)
            )?.label ?? "بوابة الحراسات المدرسية"}
          </h1>
        </header>
        <SaveErrorBanner />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
