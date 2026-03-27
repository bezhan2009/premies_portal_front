import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerPremies() {
    

  return (
    <>
      <Helmet>
        <title>Моя премия</title>
      </Helmet>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <div className="dashboard-container">
          <GetBlockInfo page="operator_premi" />
        </div>
      </div>
    </>
  );
}
