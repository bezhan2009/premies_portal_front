import { Navigate } from "react-router-dom";
import RequireRole from "../../components/RequireRole";
import { ProductLayout } from "../../pages/product/Layout";
import { CardTable } from "../../pages/product/card/CardTable";
import { CreditTable } from "../../pages/product/credit/CreditTable";
import { CurrentAccountTable } from "../../pages/product/currentAccount/CurrentAccountTable";
import { DepositTable } from "../../pages/product/deposit/DepositTable";
import { MoneyTransferTable } from "../../pages/product/moneyTransfer/MoneyTransferTable";

export const productRoutes = [
  {
    path: "/product",
    element: (
      <RequireRole allowedRoles={[22]}>
        <ProductLayout />
      </RequireRole>
    ),
    children: [
      {
        path: "",
        element: <Navigate to="cards" replace />,
      },
      {
        path: "cards",
        element: <CardTable />,
      },
      {
        path: "credits",
        element: <CreditTable />,
      },
      {
        path: "accounts",
        element: <CurrentAccountTable />,
      },
      {
        path: "deposits",
        element: <DepositTable />,
      },
      {
        path: "transfers",
        element: <MoneyTransferTable />,
      },
    ],
  },
];
