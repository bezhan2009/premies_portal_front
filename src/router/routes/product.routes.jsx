import { Route, Navigate } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole";
import { ProductLayout } from "../../pages/product/Layout";
import { CardTable } from "../../pages/product/card/CardTable";
import { CreditTable } from "../../pages/product/credit/CreditTable";
import { CurrentAccountTable } from "../../pages/product/currentAccount/CurrentAccountTable";
import { DepositTable } from "../../pages/product/deposit/DepositTable";
import { MoneyTransferTable } from "../../pages/product/moneyTransfer/MoneyTransferTable";

export const productRoutes = (
  <Route
    path="/product"
    element={
      <RequireRole allowedRoles={[22]}>
        <ProductLayout />
      </RequireRole>
    }
  >
    <Route index element={<Navigate to="cards" replace />} />
    <Route path="cards" element={<CardTable />} />
    <Route path="credits" element={<CreditTable />} />
    <Route path="accounts" element={<CurrentAccountTable />} />
    <Route path="deposits" element={<DepositTable />} />
    <Route path="transfers" element={<MoneyTransferTable />} />
  </Route>
);
