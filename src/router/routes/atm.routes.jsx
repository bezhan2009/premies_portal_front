import { Route, Outlet } from "react-router-dom";
import Checkout from "../../pages/checkout/checkout.jsx";
import AtmPage from "../../pages/atm-page/atm-page.jsx";
import RequireRole from "../../middlewares/RequireRole.jsx";

const atmRoutes = (
    <>
        <Route
            element={
                <RequireRole allowedRoles={[19]}>
                    <Outlet />
                </RequireRole>
            }
        >
            <Route path="/atm/table" element={<AtmPage />} />
            <Route path="/atm/:id/report" element={<Checkout />} />
        </Route>
    </>
);

export default atmRoutes;
