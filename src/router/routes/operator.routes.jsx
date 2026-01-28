import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";

import DashboardOperatorPremiesPage from "../../pages/dashboard/dashboard_operator/PremiesPage";
import DashboardOperatorReports from "../../pages/dashboard/dashboard_operator/ReportsPage";
import DashboardOperatorDatas from "../../pages/dashboard/dashboard_operator/DatasPage";
import DashboardOperatorKnowledgeBase from "../../pages/dashboard/dashboard_operator/KnowledgeBase";
import DashboardOperatorTests from "../../pages/dashboard/dashboard_operator/TestsPage.jsx";
import RegisterPage from "../../pages/general/RegisterPage.jsx";

const operatorRoutes = (
  <Route
    element={
      <RequireRole allowedRoles={[3]}>
        <Outlet />
      </RequireRole>
    }
  >
    <Route
      path="/operator/premies"
      element={<DashboardOperatorPremiesPage />}
    />
    <Route path="/operator/reports" element={<DashboardOperatorReports />} />
    <Route path="/operator/data" element={<DashboardOperatorDatas />} />
    <Route
      path="/operator/knowledge-base"
      element={<DashboardOperatorKnowledgeBase />}
    />
    <Route path="/operator/tests" element={<DashboardOperatorTests />} />
    <Route path="/auth/register" element={<RegisterPage />} />
  </Route>
);

export default operatorRoutes;
