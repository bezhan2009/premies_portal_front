import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";

import DashboardChairmanReports from "../../pages/dashboard/dashboard_chairman/ChairmanReports.jsx";
import DashboardChairmanKnowledgeBase from "../../pages/dashboard/dashboard_chairman/KnowledgeBase.jsx";
import DashboardDirectorReports from "../../pages/dashboard/dashboard_director/DirectorReports.jsx";
import DashboardDirectorKnowledgeBase from "../../pages/dashboard/dashboard_director/KnowledgeBase.jsx";
import DashboardFrontovikAbsSearch from "../../pages/dashboard/dashboard_frontovik/ABSSearch.jsx";
import AccountOperations from "../../pages/general/AccountOperations.jsx";
import DashboardOperatorProcessing from "../../pages/dashboard/dashboard_operator/ProcessingPage.jsx";
import DashboardOperatorProcessingTransactions from "../../pages/dashboard/dashboard_operator/Transactions.jsx";

const managementRoutes = (
  <>
    {/* Chairman (Role 9) */}
    <Route
      element={
        <RequireRole allowedRoles={[9]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="/chairman/reports" element={<DashboardChairmanReports />} />
      <Route
        path="/chairman/knowledge-base"
        element={<DashboardChairmanKnowledgeBase />}
      />
    </Route>

    {/* Director (Role 5) */}
    <Route
      element={
        <RequireRole allowedRoles={[5]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="/director/reports" element={<DashboardDirectorReports />} />
      <Route
        path="/director/knowledge-base"
        element={<DashboardDirectorKnowledgeBase />}
      />
    </Route>

    {/* Frontovik (Role 17) */}
    <Route
      element={
        <RequireRole allowedRoles={[17]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route
        path="frontovik/abs-search"
        element={<DashboardFrontovikAbsSearch />}
      />
      <Route
        path="frontovik/account-operations"
        element={<AccountOperations />}
      />
    </Route>

    {/* Processing (Role 18) */}
    <Route
      element={
        <RequireRole allowedRoles={[18]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route
        path="/processing/limits"
        element={<DashboardOperatorProcessing />}
      />
      <Route
        path="/processing/transactions"
        element={<DashboardOperatorProcessingTransactions />}
      />
      <Route
        path="/processing/transactions/:id"
        element={<DashboardOperatorProcessingTransactions />}
      />
    </Route>
  </>
);

export default managementRoutes;
