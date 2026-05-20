import { useEffect } from "react";
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

// Redirects non-admins away from admin-only routes.
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useUsers();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);
  if (!isAdmin) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
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

function App() {
  const loading = useAppLoading();
  const { currentUser } = useUsers();

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
