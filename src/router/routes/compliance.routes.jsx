import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import ComplianceSettings from "../../pages/general/ComplianceSettings";
import ComplianceRequests from "../../pages/dashboard/dashboard_compliance/ComplianceRequests.jsx";
import ComplianceScoreOptions from "../../pages/dashboard/dashboard_compliance/ComplianceScoreOptions.jsx";
import ComplianceCodeGuard from "../../components/general/ComplianceCodeGuard.jsx";

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
