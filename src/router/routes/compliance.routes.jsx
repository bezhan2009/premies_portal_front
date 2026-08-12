import { Route, Outlet, Navigate } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import ComplianceSettings from "../../pages/general/ComplianceSettings";
import ComplianceRequests from "../../pages/dashboard/dashboard_compliance/ComplianceRequests.jsx";
import ComplianceScoreOptions from "../../pages/dashboard/dashboard_compliance/ComplianceScoreOptions.jsx";
import ComplianceCodeGuard from "../../components/general/ComplianceCodeGuard.jsx";
import ComplianceListPage from "../../pages/dashboard/dashboard_compliance/ComplianceListPage.jsx";

const complianceRoutes = (
  <Route
    element={
      <RequireRole allowedRoles={[33]}>
        <ComplianceCodeGuard>
          <Outlet />
        </ComplianceCodeGuard>
      </RequireRole>
    }
  >
    <Route path="/compliance" element={<Navigate to="/compliance/white-list" replace />} />
    <Route path="/compliance/white-list" element={<ComplianceListPage listType="white" />} />
    <Route path="/compliance/black-list" element={<ComplianceListPage listType="black" />} />
    <Route
      path="/compliance/settings"
      element={<ComplianceSettings />}
    />
    <Route
      path="/compliance/requests"
      element={<ComplianceRequests />}
    />
    <Route
      path="/compliance/score-options"
      element={<ComplianceScoreOptions />}
    />
  </Route>
);

export default complianceRoutes;
