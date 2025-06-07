import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import LoginPage from '../pages/general/LoginPage';
import DashboardRedirectPage from '../pages/dashboard/dashboard';
import DashboardOperatorPremiesPage from '../pages/dashboard/dashboard_operator/PremiesPage';
import DashboardOperatorReports from '../pages/dashboard/dashboard_operator/ReportsPage';
import DashboardOperatorDatas from '../pages/dashboard/dashboard_operator/DatasPage';
import DashboardOperatorKnowledgeBase from '../pages/dashboard/dashboard_operator/KnowledgeBase';
import RequireAuth from '../middlewares/RequireAuth';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичный маршрут */}
        <Route path="/login" element={<LoginPage />} />

        {/* Защищённые маршруты (группа) */}
        <Route element={<RequireAuth><Outlet /></RequireAuth>}>
          <Route path="/" element={<DashboardRedirectPage />} />
          <Route path="/operator/premies" element={<DashboardOperatorPremiesPage />} />
          <Route path="/operator/reports" element={<DashboardOperatorReports />} />
          <Route path="/operator/data" element={<DashboardOperatorDatas />} />
          <Route path="/operator/knowledge-base" element={<DashboardOperatorKnowledgeBase />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
