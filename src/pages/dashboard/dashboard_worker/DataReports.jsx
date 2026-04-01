import "../../../styles/dashboard.scss";
import HeaderWorker from "../../../components/dashboard/dashboard_worker/MenuWorker";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerReports() {
  return (
    <>
      <Helmet>
        <title>Отчеты</title>
      </Helmet>
      <GetBlockInfo page="worker_report" />
    </>
  );
}
