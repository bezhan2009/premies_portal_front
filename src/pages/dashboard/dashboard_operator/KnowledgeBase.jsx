import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <GetBlockInfo page="operator_knowledge_base" />
    </>
  );
}
