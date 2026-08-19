import { Route } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";
import UnderDevelopmentPage from "../../pages/general/UnderDevelopmentPage.jsx";

const internetBankingRoutes = (
  <Route
    path="/internet-bank"
    element={
      <RequireRole allowedRoles={[43]}>
        <UnderDevelopmentPage />
      </RequireRole>
    }
  />
);

export default internetBankingRoutes;
