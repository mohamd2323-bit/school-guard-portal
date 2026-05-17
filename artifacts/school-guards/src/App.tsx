import { Switch, Route, Router as WouterRouter } from "wouter";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Guards from "./pages/Guards";
import Schools from "./pages/Schools";
import DataManagement from "./pages/DataManagement";
import Needs from "./pages/Needs";

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      الصفحة غير موجودة
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/guards" component={Guards} />
        <Route path="/schools" component={Schools} />
        <Route path="/needs" component={Needs} />
        <Route path="/data" component={DataManagement} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
