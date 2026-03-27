import "../../../styles/dashboard.scss";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardAgentKB() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
