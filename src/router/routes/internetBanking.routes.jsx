import { Route } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import InternetBankingPage from "../../pages/dashboard/dashboard_internet_banking/InternetBankingPage.jsx";

const internetBankingRoutes = (
  <Route
    path="/internet-bank"
    element={
      <RequireRole allowedRoles={[43]}>
        <InternetBankingPage />
      </RequireRole>
    }
  />
);

export default internetBankingRoutes;
