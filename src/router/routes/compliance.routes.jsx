import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import ComplianceSettings from "../../pages/general/ComplianceSettings";

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
  </Route>
);

export default complianceRoutes;
