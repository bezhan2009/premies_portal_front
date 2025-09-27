import "../../../styles/dashboard.scss";
import HeaderWorker from "../../../components/dashboard/dashboard_worker/MenuWorker";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerCredits() {
  return (
    <>
      <Helmet>
        <title>Кредиты</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderWorker activeLink="credits" />
        </header>
        <GetBlockInfo page="und" />
      </div>
    </>
  );
}
