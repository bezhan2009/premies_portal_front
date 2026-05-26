import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import ComplianceSettings from "../../pages/general/ComplianceSettings";

import ComplianceRequests from "../../pages/dashboard/dashboard_compliance/ComplianceRequests.jsx";

const complianceRoutes = (
  <Route
    element={
      <RequireRole allowedRoles={[33]}>
        <Outlet />
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
  </Route>
);

export default complianceRoutes;
