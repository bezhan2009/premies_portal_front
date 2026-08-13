import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./general/DynamicMenu.jsx";
import useSidebar from "../hooks/useSideBar.js";
import CurrencyRatesWidget from "./general/CurrencyRatesWidget.jsx";
import MiniChatWindow from "./general/MiniChatWindow.jsx";
import useThemeStore from "../store/useThemeStore.js";
import { useEffect } from "react";
import Header from "./layout/Header.jsx";
import TabsBar from "./layout/TabsBar.jsx";
import useTabsStore from "../store/useTabsStore.js";
import useNavigationStore from "../store/useNavigationStore.js";
import { motion as Motion, AnimatePresence } from "framer-motion";
import LiveWorkflowProvider from "./live-workflow/LiveWorkflowProvider.jsx";

const MainLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { applySettings } = useThemeStore();

  useEffect(() => {
    applySettings();
  }, [applySettings]);

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
    if (pathname.includes("/operator/users")) return "users_operator";
    if (pathname.includes("/operator/access-requests")) return "access_requests_operator";
    if (pathname.includes("/operator/docx-generator")) return "docx_generator";
    if (pathname.includes("/customers")) return "customers";

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
    if (pathname.includes("/account-reconciliation")) return "account_reconciliation";

    // ATM
    if (pathname.includes("/atm/table")) return "atm_table";

    // Cashback
    if (pathname.includes("/cashback/settings")) return "cashbacks_settings";
    if (pathname.includes("/cashback/card-list")) return "card_cashback_list";
    if (pathname.includes("/cashback/monthly-limits")) return "cashback_monthly_limits";
    if (pathname.includes("/cashback/qr-list")) return "qr_cashback_list";

    // Rohat
    if (pathname.includes("/rohat")) return "rohat";

    // Payments
    if (pathname.includes("agent-payments/list")) return "payments_list";

    // PVN
    if (pathname.includes("/pvn/transactions")) return "pvn_transactions";
    if (pathname.includes("/pvn/settings")) return "pvn_settings";

    // Knowledge base
    if (pathname.includes("knowledge-base")) return "knowledge";

    // Compliance
    if (pathname.includes("/compliance/white-list")) return "compliance_white_list";
    if (pathname.includes("/compliance/black-list")) return "compliance_black_list";
    if (pathname.includes("/compliance/requests")) return "compliance_requests";
    if (pathname.includes("/compliance/score-options")) return "compliance_score_options";
    if (pathname.includes("/compliance/settings")) return "compliance_settings";

    // Audit Logs
    if (pathname.includes("admin/audit-logs")) return "audit_logs_viewer";
    
    // Missing additions
    if (pathname.includes("/client-documents")) return "client_documents";
    if (pathname.includes("/card-balance")) return "card_balance";
    if (pathname.includes("/admin/logs")) return "logs_viewer";
    if (pathname.includes("/admin/daily-tasks")) return "dt_management";
    if (pathname.includes("/mail-agent")) return "mail_agent_send";
    if (pathname === "/settings") return "settings";

    if (pathname.includes("/agent/client-pins")) return "client_pins_list";
    
    // Feedback
    if (pathname.includes("/operator/feedback")) return "feedback_operator";
    if (pathname.includes("/submit-feedback")) return "submit_feedback";
    if (pathname.includes("/feedback")) return "feedback";

    // Groups
    if (pathname.includes("/operator/groups")) return "groups_operator";
    if (pathname.includes("/groups")) return "groups";

    return "";
  };

  const activeLink = getActiveLink(location.pathname);

  const { addTab, splitTabHref, clearSplitTab } = useTabsStore();
  const { flatLinks } = useNavigationStore();

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/404') return;
    
    const link = flatLinks.find(l => l.href === location.pathname);
    if (link) {
      addTab({ href: location.pathname, name: link.name });
    } else {
      const parts = location.pathname.split('/').filter(Boolean);
      const fallbackName = location.pathname === "/settings"
        ? "Настройки"
        : (parts.length > 0 ? parts[parts.length - 1] : "Вкладка");
      // We capitalize the fallback name slightly
      const prettyName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      addTab({ href: location.pathname, name: prettyName });
    }
  }, [location.pathname, flatLinks, addTab]);

  const isBareMode = location.search.includes("bare=true");
  const isAbsSearchRoute = location.pathname.includes("/frontovik/abs-search");
  const isUserKnowledgeBaseRoute = location.pathname === "/user/knowledge-base";
  const layoutClassName = [
    isAbsSearchRoute && "abs-search-layout",
    isUserKnowledgeBaseRoute && "knowledge-base-layout",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  if (isBareMode) {
    return (
      <div style={{ flex: 1, padding: '16px', height: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </div>
    );
  }

  return (
    <LiveWorkflowProvider>
    <div
      className={layoutClassName}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <Header toggleSidebar={toggleSidebar} />
      <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`} style={{ flex: 1, overflow: 'hidden', padding: 0, margin: 0, display: 'flex', gap: 0 }}>
        <Sidebar
          activeLink={activeLink}
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />
        <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <TabsBar />
          
          <div className="main-layout-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div className="page-content" style={{ flex: 1, overflowY: 'auto', padding: '16px', position: 'relative' }}>
              <AnimatePresence mode="wait" initial={false}>
                <Motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  style={{ minHeight: '100%', width: '100%' }}
                >
                  <Outlet />
                </Motion.div>
              </AnimatePresence>
            </div>
            
            {splitTabHref && (
              <div style={{ flex: 1, borderLeft: '1px solid var(--border-color, #eaeaea)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px', background: 'var(--bg-secondary, #f9f9f9)', borderBottom: '1px solid var(--border-color, #eaeaea)' }}>
                  <button 
                    onClick={clearSplitTab}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '12px', color: 'var(--text-secondary, #666)' }}
                  >
                    Закрыть сплит-экран ✕
                  </button>
                </div>
                <iframe 
                  src={`${splitTabHref}?bare=true`} 
                  style={{ flex: 1, border: 'none', width: '100%' }} 
                  title="Parallel View"
                />
              </div>
            )}
          </div>
          
        </div>
      </div>
      <CurrencyRatesWidget />
      <MiniChatWindow />
    </div>
    </LiveWorkflowProvider>
  );
};

export default MainLayout;
