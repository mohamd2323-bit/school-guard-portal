import { useCallback, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Guards from "./pages/Guards";
import Schools from "./pages/Schools";
import DataManagement from "./pages/DataManagement";
import Needs from "./pages/Needs";
import Tickets from "./pages/Tickets";
import Operations from "./pages/Operations";
import Violations from "./pages/Violations";
import Users from "./pages/Users";
import LoginPage from "./pages/LoginPage";
import { useAppLoading } from "./store/useStore";
import { useUsers } from "./store/useUsers";
import { useIdleTimeout } from "./hooks/useIdleTimeout";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const IDLE_LOGOUT_MSG_KEY = "idle_logout_msg";
const DEFAULT_PAGE_TITLE = "وزارة التعليم | بوابة الحراسات المدرسية";

const PAGE_TITLES: Record<string, string> = {
  "/": "وزارة التعليم | لوحة التحكم",
  "/guards": "وزارة التعليم | إدارة الحراس",
  "/schools": "وزارة التعليم | إدارة المدارس",
  "/operations": "وزارة التعليم | العمليات",
  "/needs": "وزارة التعليم | الاحتياج",
  "/violations": "وزارة التعليم | المخالفات",
  "/tickets": "وزارة التعليم | بلاغات الدعم",
  "/data": "وزارة التعليم | إدارة البيانات",
  "/users": "وزارة التعليم | الإعدادات",
};

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      الصفحة غير موجودة
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground font-medium">جارٍ تحميل البيانات…</p>
      </div>
    </div>
  );
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useUsers();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);
  if (!isAdmin) return null;
  return <>{children}</>;
}

function PageTitle() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLES[location] ?? DEFAULT_PAGE_TITLE;
  }, [location]);
  return null;
}

function Router() {
  return (
    <Layout>
      <PageTitle />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/guards" component={Guards} />
        <Route path="/schools" component={Schools} />
        <Route path="/needs" component={Needs} />
        <Route path="/operations" component={Operations} />
        <Route path="/violations" component={Violations} />
        <Route path="/tickets" component={Tickets} />
        <Route path="/data" component={DataManagement} />
        <Route path="/users">
          {() => (
            <AdminOnly>
              <Users />
            </AdminOnly>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function IdleWatcher() {
  const { logout } = useUsers();

  const handleTimeout = useCallback(() => {
    try {
      sessionStorage.setItem(
        IDLE_LOGOUT_MSG_KEY,
        "تم تسجيل خروجك بسبب عدم النشاط لمدة ساعة، يرجى تسجيل الدخول مرة أخرى"
      );
    } catch {}
    logout();
  }, [logout]);

  useIdleTimeout(handleTimeout, IDLE_TIMEOUT_MS);

  return null;
}

function App() {
  const loading = useAppLoading();
  const { currentUser } = useUsers();

  useEffect(() => {
    if (!currentUser) document.title = DEFAULT_PAGE_TITLE;
  }, [currentUser]);

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      {currentUser && <IdleWatcher />}
      {loading ? (
        <LoadingScreen />
      ) : !currentUser ? (
        <LoginPage />
      ) : (
        <Router />
      )}
    </WouterRouter>
  );
}

export default App;
