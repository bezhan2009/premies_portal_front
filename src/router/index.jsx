import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../pages/general/LoginPage";
import DashboardRedirectPage from "../pages/dashboard/dashboard";
import UnderDevelopmentPage from "../pages/general/UnderDevelopmentPage";
import RequireAuth from "../middlewares/RequireAuth";
import PageNotFound from "../pages/general/NotFound.jsx";
import MainLayout from "../components/MainLayout.jsx";

// Modularized routes
import operatorRoutes from "./routes/operator.routes";
import workerRoutes from "./routes/worker.routes";
import agentRoutes from "./routes/agent.routes";
import managementRoutes from "./routes/management.routes";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичный маршрут */}
        <Route path="/login" element={<LoginPage />} />

        {/* Защищённые маршруты */}
        <Route
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          {/* Дашборд редирект */}
          <Route path="/" element={<DashboardRedirectPage />} />

          {/* Подготовленные страницы */}
          <Route path="/under/development" element={<UnderDevelopmentPage />} />

          {/* Load modularized routes */}
          {operatorRoutes}
          {workerRoutes}
          {agentRoutes}
          {managementRoutes}
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
