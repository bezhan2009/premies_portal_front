import { Route, Outlet } from "react-router-dom";
import RequireRole from "../../middlewares/RequireRole.jsx";

import GiftCard from "../../pages/general/GiftCard.jsx";
import MyApplications from "../../pages/general/MyApplications.jsx";
import ApplicationsList from "../../pages/general/ApplicationsList.jsx";
import DashboardAgentKB from "../../pages/dashboard/dashboard_agent/KBAgentPage.jsx";

import GiftCardDipozit from "../../pages/general/GiftCardDipozit.jsx";
import MyApplicationsDipozit from "../../pages/general/MyApplicationsDipozit.jsx";
import ApplicationsListDipozit from "../../pages/general/ApplicationsListDipozit.jsx";
import DashboardDipozitKnowledgeBase, {
  DashboardQRKnowledgeBase,
} from "../../pages/general/KnowledgeBase.jsx";

import GiftCardCredit from "../../pages/general/GiftCardCredit.jsx";
import ApplicationsListCredit from "../../pages/general/ApplicationsListCredit.jsx";
import DashboardAgentKBCredit from "../../pages/dashboard/dashboard_credit/KBAgentPageCredit.jsx";

import Transactions from "../../pages/general/TransactionsQR.jsx";
import SendSmsForm from "../../pages/dashboard/dashboard_sms/SenderSMS.jsx";
import DashboardAgentSMSKnowledgeBase from "../../pages/dashboard/dashboard_sms/KnowledgeBase.jsx";
import UpdatingTransactionType from "../../pages/general/TransactionTypes.jsx";
import TerminalNames from "../../pages/general/TerminalNames.jsx";
import EQMSList from "../../pages/general/EqmsTableList.jsx";

const agentRoutes = (
  <>
    {/* Agent (Role 10) */}
    <Route
      element={
        <RequireRole allowedRoles={[10]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="/agent/card" element={<GiftCard />} />
      <Route path="/agent/card/:id" element={<GiftCard edit={true} />} />
      <Route path="/agent/my-applications" element={<MyApplications />} />
      <Route path="/agent/applications-list" element={<ApplicationsList />} />
      <Route path="/agent/knowledge-base" element={<DashboardAgentKB />} />
    </Route>

    {/* Agent Deposit (Role 12) */}
    <Route
      element={
        <RequireRole allowedRoles={[12]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="/agent/dipozit/card" element={<GiftCardDipozit />} />
      <Route
        path="/agent/dipozit/card/:id"
        element={<GiftCardDipozit edit={true} />}
      />
      <Route
        path="/agent/dipozit/my-applications"
        element={<MyApplicationsDipozit />}
      />
      <Route
        path="/agent/dipozit/applications-list"
        element={<ApplicationsListDipozit />}
      />
      <Route
        path="/agent/dipozit/knowledge-base"
        element={<DashboardDipozitKnowledgeBase />}
      />
    </Route>

    {/* Agent Credit (Role 11) */}
    <Route
      element={
        <RequireRole allowedRoles={[11]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="/credit/card" element={<GiftCardCredit />} />
      <Route path="/credit/card/:id" element={<GiftCardCredit edit={true} />} />
      <Route
        path="/credit/applications-list"
        element={<ApplicationsListCredit />}
      />
      <Route
        path="/credit/knowledge-base"
        element={<DashboardAgentKBCredit />}
      />
    </Route>

    {/* Agent QR (Role 13) */}
    <Route
      element={
        <RequireRole allowedRoles={[13]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="agent-qr/transactions/list" element={<Transactions />} />
      <Route
        path="agent-qr/knowledge-base"
        element={<DashboardQRKnowledgeBase />}
      />
    </Route>

    {/* Agent SMS (Role 14) */}
    <Route
      element={
        <RequireRole allowedRoles={[14]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="agent-sms/sms-sender" element={<SendSmsForm />} />
      <Route
        path="agent-sms/knowledge-base"
        element={<DashboardAgentSMSKnowledgeBase />}
      />
    </Route>

    {/* Agent Transaction (Role 15) */}
    <Route
      element={
        <RequireRole allowedRoles={[15]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route
        path="agent-transaction/update-transaction"
        element={<UpdatingTransactionType />}
      />
      <Route
        path="/agent-transaction/terminal-names"
        element={<TerminalNames />}
      />
    </Route>

    {/* Agent Custom (Role 16) */}
    <Route
      element={
        <RequireRole allowedRoles={[16]}>
          <Outlet />
        </RequireRole>
      }
    >
      <Route path="agent-custom/eqms" element={<EQMSList />} />
    </Route>
  </>
);

export default agentRoutes;
