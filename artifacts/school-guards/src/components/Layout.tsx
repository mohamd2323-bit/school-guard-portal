import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useSaveError } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import moeLogoTransparent from "../assets/images/moe-logo-transparent.png";
import {
  AlertTriangle,
  ClipboardList,
  Database,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  School,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  Wifi,
  X,
} from "lucide-react";

const THEME_KEY = "school_guard_theme";

const navGroups = [
  {
    label: "النظرة العامة",
    items: [{ href: "/", label: "مركز العمليات", icon: LayoutDashboard }],
  },
  {
    label: "السجلات",
    items: [
      { href: "/guards", label: "إدارة الحراس", icon: ShieldCheck },
      { href: "/schools", label: "إدارة المدارس", icon: School },
    ],
  },
  {
    label: "التشغيل والمتابعة",
    items: [
      { href: "/needs", label: "الاحتياج", icon: ClipboardList },
      { href: "/operations", label: "إدارة العمليات", icon: Settings2 },
      { href: "/violations", label: "المخالفات", icon: AlertTriangle },
      { href: "/tickets", label: "بلاغات الدعم الموحد", icon: Headphones },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/data", label: "إدارة البيانات", icon: Database },
      { href: "/users", label: "صلاحيات الموظفين", icon: Users },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function SaveErrorBanner() {
  const { error, dismiss } = useSaveError();
  if (!error) return null;
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-200" dir="rtl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-300" />
        <span className="flex-1">{error}</span>
        <button
          onClick={dismiss}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md hover:bg-red-100 hover:text-red-900 dark:hover:bg-red-900/60 dark:hover:text-white"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
      aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const { currentUser, logout } = useUsers();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const currentPage = useMemo(
    () =>
      navItems.find((item) =>
        item.href === "/" ? location === "/" || location === "" : location.startsWith(item.href)
      ),
    [location]
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground" dir="rtl">
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col border-l border-sidebar-border
          bg-sidebar text-sidebar-foreground shadow-2xl shadow-black/10 transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
          lg:static lg:translate-x-0 lg:shadow-none
        `}
      >
        <div className="flex min-h-20 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-5">بوابة الحراسات المدرسية</p>
            <p className="truncate text-xs text-sidebar-foreground/70">مركز عمليات الأمن والسلامة</p>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-5 px-3 py-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold text-sidebar-foreground/45">
                  {group.label}
                </p>
                {group.items.map((item) => {
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
                      <span className="active-indicator" />
                      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

        <div className="flex flex-shrink-0 justify-center px-0 pb-8 pt-6">
          <img
            src={moeLogoTransparent}
            alt="شعار وزارة التعليم"
            className="h-auto w-[82%] max-w-[230px] object-contain"
            draggable={false}
          />
        </div>

        <div className="flex-shrink-0 border-t border-sidebar-border p-4">
          {currentUser && (
            <div className="rounded-lg bg-sidebar-accent/70 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{currentUser.name}</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/60">{currentUser.role}</p>
                </div>
                <button
                  onClick={logout}
                  title="تسجيل خروج"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sidebar-foreground/65 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold lg:text-base">
                {currentPage?.label ?? "بوابة الحراسات المدرسية"}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                قاعدة البيانات المحلية هي المصدر الرسمي لهذه النسخة
              </p>
            </div>

            <button
              type="button"
              className="hidden h-10 min-w-[260px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent xl:flex"
              title="البحث العالمي سيضاف في مرحلة لاحقة"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">بحث عام في الحراس والمدارس والبلاغات...</span>
            </button>

            <div className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-200 md:flex">
              <Wifi className="h-4 w-4" />
              <span>محلي</span>
            </div>

            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
            />
          </div>
        </header>

        <SaveErrorBanner />

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
