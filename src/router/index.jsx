import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';

import LoginPage from '../pages/general/LoginPage';

import DashboardRedirectPage from '../pages/dashboard/dashboard';

import DashboardOperatorPremiesPage from '../pages/dashboard/dashboard_operator/PremiesPage';
import DashboardOperatorReports from '../pages/dashboard/dashboard_operator/ReportsPage';
import DashboardOperatorDatas from '../pages/dashboard/dashboard_operator/DatasPage';
import DashboardOperatorKnowledgeBase from '../pages/dashboard/dashboard_operator/KnowledgeBase';

import DashboardWorkerPremies from '../pages/dashboard/dashboard_worker/PremiesWorkerPage';
import DashboardWorkerCards from "../pages/dashboard/dashboard_worker/CardsWorkerPage.jsx";
import DashboardWorkerCredits from "../pages/dashboard/dashboard_worker/CreditsWorkerPage.jsx";
import DashboardWorkerKB from "../pages/dashboard/dashboard_worker/KBWorkerPage.jsx";
import DashboardWorkerTests from "../pages/dashboard/dashboard_worker/TestsWorkerPage.jsx";

import DashboardChairmanReports from "../pages/dashboard/dashboard_chairman/ChairmanReports.jsx";

import UnderDevelopmentPage from '../pages/general/UnderDevelopmentPage';

import RequireAuth from '../middlewares/RequireAuth';

import PageNotFound from "../pages/general/NotFound.jsx";

export default function AppRouter() {
  return (
      <BrowserRouter>
        <Routes>
          {/* Публичный маршрут */}
          <Route path="/login" element={<LoginPage />} />

          {/* Защищённые маршруты */}
          <Route element={<RequireAuth><Outlet /></RequireAuth>}>
            <Route path="/" element={<DashboardRedirectPage />} />
            <Route path="/under/development" element={<UnderDevelopmentPage />} />
            <Route path="/operator/premies" element={<DashboardOperatorPremiesPage />} />
            <Route path="/operator/reports" element={<DashboardOperatorReports />} />
            <Route path="/operator/data" element={<DashboardOperatorDatas />} />
            <Route path="/operator/knowledge-base" element={<DashboardOperatorKnowledgeBase />} />

            <Route path="/worker/premies" element={<DashboardWorkerPremies />} />
            <Route path="/worker/cards" element={<DashboardWorkerCards />} />
            <Route path="/worker/credits" element={<DashboardWorkerCredits />} />
            <Route path="/worker/tests" element={<DashboardWorkerTests />} />
            <Route path="/worker/knowledge-base" element={<DashboardWorkerKB />} />

            <Route path="/chairman/reports" element={<DashboardChairmanReports />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
  );
}
