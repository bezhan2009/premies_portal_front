import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./general/DynamicMenu.jsx";
import useSidebar from "../hooks/useSideBar.js";
import CurrencyRatesWidget from "./general/CurrencyRatesWidget.jsx";

const MainLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  const getActiveLink = (pathname) => {
    // Product pages
    if (pathname.includes("/product/cards")) return "product_cards";
    if (pathname.includes("/product/credits")) return "product_credits";
    if (pathname.includes("/product/accounts")) return "product_accounts";
    if (pathname.includes("/product/deposits")) return "product_deposits";
    if (pathname.includes("/product/transfers")) return "product_transfers";

    // Operator pages
    if (pathname.includes("/operator/premies")) return "premi";
    if (pathname.includes("/operator/reports")) return "reports_operator";
    if (pathname.includes("/operator/data")) return "data";
    if (pathname.includes("/operator/knowledge-base")) return "kb_operator";
    if (pathname.includes("/operator/tests")) return "tests_operator";

    // Worker pages
    if (pathname.includes("/worker/premies")) return "worker_premies";
    if (pathname.includes("/worker/tests")) return "tests";
    if (pathname.includes("/worker/reports")) return "worker_reports";

    // Director / Chairman
    if (pathname.includes("/director/reports")) return "director";
    if (pathname.includes("/chairman/reports")) return "chairman";

    // Agent card pages
    if (pathname.includes("/agent/applications-list")) return "applications";
    if (pathname.includes("/agent/card")) return "gift_card";
    if (pathname.includes("/agent/my-applications")) return "applications";

    // Agent deposit pages
    if (pathname.includes("/agent/dipozit/applications-list")) return "deposits";
    if (pathname.includes("/agent/dipozit/card")) return "gift_deposit";
    if (pathname.includes("/agent/dipozit/my-applications")) return "deposits";

    // Credit pages
    if (pathname.includes("/credit/applications-list")) return "credits";
    if (pathname.includes("/credit/card")) return "gift_credit";

    // QR Agent
    if (pathname.includes("agent-qr/transactions")) return "list_qr";
    if (pathname.includes("accounts-qr/operations")) return "qr_another_bank_transactions";
    if (pathname.includes("accounts-qr/settings")) return "qr_another_bank_settings";

    // SMS Agent
    if (pathname.includes("agent-sms/sms-sender")) return "sms_send";

    // Transaction Agent
    if (pathname.includes("agent-transaction/update-transaction")) return "update_transaction";
    if (pathname.includes("agent-transaction/terminal-names")) return "terminal_names";

    // Customs
    if (pathname.includes("agent-custom/eqms")) return "eqms_list";

    // Frontovik
    if (pathname.includes("frontovik/abs-search")) return "abs_search";

    // Processing
    if (pathname.includes("/processing/limits")) return "limits";
    if (pathname.includes("/processing/transactions")) return "transactions";
    if (pathname.includes("/processing-search/transactions")) return "transactions_search";

    // Account operations
    if (pathname.includes("account-operations")) return "account_operations";

    // ATM
    if (pathname.includes("/atm/table")) return "atm_table";

    // Cashback
    if (pathname.includes("/cashback/settings")) return "cashbacks_settings";
    if (pathname.includes("/cashback/card-list")) return "card_cashback_list";
    if (pathname.includes("/cashback/qr-list")) return "qr_cashback_list";

    // Payments
    if (pathname.includes("agent-payments/list")) return "payments_list";

    // PVN
    if (pathname.includes("/pvn/transactions")) return "pvn_transactions";
    if (pathname.includes("/pvn/settings")) return "pvn_settings";

    // Knowledge base
    if (pathname.includes("knowledge-base")) return "knowledge";

    return "";
  };

  const activeLink = getActiveLink(location.pathname);

  return (
    <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <Sidebar
        activeLink={activeLink}
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
      />
      <div className="main-content-wrapper">
        <Outlet />
      </div>
      <CurrencyRatesWidget />
    </div>
  );
};

export default MainLayout;
