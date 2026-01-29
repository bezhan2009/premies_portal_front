import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";

import DashboardWorkerPremies from "../../pages/dashboard/dashboard_worker/PremiesWorkerPage";
import DashboardWorkerCards from "../../pages/dashboard/dashboard_worker/CardsWorkerPage.jsx";
import DashboardWorkerCredits from "../../pages/dashboard/dashboard_worker/CreditsWorkerPage.jsx";
import DashboardWorkerTests from "../../pages/dashboard/dashboard_worker/TestsWorkerPage.jsx";
import DashboardWorkerKB from "../../pages/dashboard/dashboard_worker/KBWorkerPage.jsx";
import DashboardWorkerReports from "../../pages/dashboard/dashboard_worker/DataReports.jsx";

const workerRoutes = (
  <Route
    element={
      <RequireRole allowedRoles={[6, 8]}>
        <Outlet />
      </RequireRole>
    }
  >
    <Route path="/worker/premies" element={<DashboardWorkerPremies />} />
    <Route path="/worker/cards" element={<DashboardWorkerCards />} />
    <Route path="/worker/credits" element={<DashboardWorkerCredits />} />
    <Route path="/worker/tests" element={<DashboardWorkerTests />} />
    <Route path="/worker/knowledge-base" element={<DashboardWorkerKB />} />
    <Route path="/worker/reports" element={<DashboardWorkerReports />} />
  </Route>
);

export default workerRoutes;
