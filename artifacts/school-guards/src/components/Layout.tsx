import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShieldCheck,
  School,
  Database,
  ClipboardList,
  Headphones,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/guards", label: "إدارة الحراس", icon: ShieldCheck },
  { href: "/schools", label: "إدارة المدارس", icon: School },
  { href: "/needs", label: "الاحتياج", icon: ClipboardList },
  { href: "/tickets", label: "بلاغات الدعم الموحد", icon: Headphones },
  { href: "/data", label: "إدارة البيانات", icon: Database },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <button
            className="lg:hidden text-white/70 hover:text-white flex-shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">نظام إدارة الحراسات المدرسية</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted text-foreground"
            onClick={() => setMobileOpen(true)}
          >
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

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
