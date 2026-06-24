import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";

import DashboardOperatorPremiesPage from "../../pages/dashboard/dashboard_operator/PremiesPage";
import DashboardOperatorReports from "../../pages/dashboard/dashboard_operator/ReportsPage";
import DashboardOperatorDatas from "../../pages/dashboard/dashboard_operator/DatasPage";
import DashboardOperatorKnowledgeBase from "../../pages/dashboard/dashboard_operator/KnowledgeBase";
import DashboardOperatorTests from "../../pages/dashboard/dashboard_operator/TestsPage.jsx";
import AccessRequestsPage from "../../pages/dashboard/dashboard_operator/AccessRequestsPage.jsx";
import UsersPage from "../../pages/dashboard/dashboard_operator/UsersPage.jsx";
import OperatorFeedbackPage from "../../pages/dashboard/dashboard_operator/OperatorFeedbackPage.jsx";

import DocxGenerator from "../../components/dashboard/dashboard_operator/DocxGenerator.jsx";

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
    <Route path="/operator/access-requests" element={<AccessRequestsPage />} />
    <Route path="/operator/users" element={<UsersPage />} />
    <Route path="/operator/feedback" element={<OperatorFeedbackPage />} />
    <Route path="/operator/docx-generator" element={<DocxGenerator />} />
  </Route>
);

export default operatorRoutes;
