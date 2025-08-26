import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";

import LoginPage from "../pages/general/LoginPage";

import DashboardRedirectPage from "../pages/dashboard/dashboard";

import DashboardOperatorPremiesPage from "../pages/dashboard/dashboard_operator/PremiesPage";
import DashboardOperatorReports from "../pages/dashboard/dashboard_operator/ReportsPage";
import DashboardOperatorDatas from "../pages/dashboard/dashboard_operator/DatasPage";
import DashboardOperatorKnowledgeBase from "../pages/dashboard/dashboard_operator/KnowledgeBase";
import DashboardOperatorTests from "../pages/dashboard/dashboard_operator/TestsPage.jsx";

import DashboardWorkerPremies from "../pages/dashboard/dashboard_worker/PremiesWorkerPage";
import DashboardWorkerCards from "../pages/dashboard/dashboard_worker/CardsWorkerPage.jsx";
import DashboardWorkerCredits from "../pages/dashboard/dashboard_worker/CreditsWorkerPage.jsx";
import DashboardWorkerKB from "../pages/dashboard/dashboard_worker/KBWorkerPage.jsx";
import DashboardWorkerTests from "../pages/dashboard/dashboard_worker/TestsWorkerPage.jsx";
import DashboardWorkerReports from "../pages/dashboard/dashboard_worker/DataReports.jsx";

import DashboardChairmanReports from "../pages/dashboard/dashboard_chairman/ChairmanReports.jsx";

import UnderDevelopmentPage from "../pages/general/UnderDevelopmentPage";

import RequireAuth from "../middlewares/RequireAuth";

import PageNotFound from "../pages/general/NotFound.jsx";
import DashboardChairmanKnowledgeBase from "../pages/dashboard/dashboard_chairman/KnowledgeBase.jsx";
import RegisterPage from "../pages/general/RegisterPage.jsx";
import RequireRole from "../middlewares/RequireRole.jsx";
import DashboardWorkerApplicationCards from "../pages/dashboard/dashboard_worker/ApplicationCardsWorker.jsx";
import GiftCard from "../pages/general/GiftCard.jsx";
import MyApplications from "../pages/general/MyApplications.jsx";
import ApplicationsList from "../pages/general/ApplicationsList.jsx";
import DashboardAgentKB from "../pages/dashboard/dashboard_agent/KBAgentPage.jsx";
import DashboardDirectorReports from "../pages/dashboard/dashboard_director/DirectorReports.jsx";
import DashboardDirectorKnowledgeBase from "../pages/dashboard/dashboard_director/KnowledgeBase.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичный маршрут */}
        <Route path="/login" element={<LoginPage />} />

        {/* Защищённые маршруты */}
        <Route
          element={
            <RequireAuth>
              <Outlet />
            </RequireAuth>
          }
        >
          {/* Дашборд редирект */}
          <Route path="/" element={<DashboardRedirectPage />} />

          {/* Подготовленные страницы */}
          <Route path="/under/development" element={<UnderDevelopmentPage />} />

          {/* Operator-only routes */}
          <Route
            element={
              <RequireRole allowedRoles={[3]}>
                <Outlet />
              </RequireRole>
            }
          >
            <Route
              path="/operator/premies"
              element={<DashboardOperatorPremiesPage />}
            />
            <Route
              path="/operator/reports"
              element={<DashboardOperatorReports />}
            />
            <Route path="/operator/data" element={<DashboardOperatorDatas />} />
            <Route
              path="/operator/knowledge-base"
              element={<DashboardOperatorKnowledgeBase />}
            />
            <Route
              path="/operator/tests"
              element={<DashboardOperatorTests />}
            />
            <Route path="/auth/register" element={<RegisterPage />} />
          </Route>

          {/* Worker-only routes */}
          <Route
            element={
              <RequireRole allowedRoles={[6, 8]}>
                <Outlet />
              </RequireRole>
            }
          >
            <Route
              path="/worker/premies"
              element={<DashboardWorkerPremies />}
            />
            <Route path="/worker/cards" element={<DashboardWorkerCards />} />
            <Route
              path="/worker/credits"
              element={<DashboardWorkerCredits />}
            />
            <Route path="/worker/tests" element={<DashboardWorkerTests />} />
            <Route
              path="/worker/knowledge-base"
              element={<DashboardWorkerKB />}
            />
            <Route
              path="/worker/reports"
              element={<DashboardWorkerReports />}
            />
          </Route>

          {/* Chairman-only routes */}
          <Route
            element={
              <RequireRole allowedRoles={[9]}>
                <Outlet />
              </RequireRole>
            }
          >
            <Route
              path="/chairman/reports"
              element={<DashboardChairmanReports />}
            />
            <Route
              path="/chairman/knowledge-base"
              element={<DashboardChairmanKnowledgeBase />}
            />
          </Route>
          {/* Director-only routes */}
          <Route
            element={
              <RequireRole allowedRoles={[5]}>
                <Outlet />
              </RequireRole>
            }
          >
            <Route
              path="/director/reports"
              element={<DashboardDirectorReports />}
            />
            <Route
              path="/director/knowledge-base"
              element={<DashboardDirectorKnowledgeBase />}
            />
          </Route>
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
            <Route
              path="/agent/applications-list"
              element={<ApplicationsList />}
            />
            <Route
              path="/agent/knowledge-base"
              element={<DashboardAgentKB />}
            />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
