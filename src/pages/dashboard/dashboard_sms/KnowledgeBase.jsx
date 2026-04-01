import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardAgentSMSKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <GetBlockInfo page="worker_knowledge_base" />
    </>
  );
}
