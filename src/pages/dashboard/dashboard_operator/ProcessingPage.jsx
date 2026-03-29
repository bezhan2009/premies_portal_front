import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorProcessing() {
  return (
    <>
      <Helmet>
        <title>Процессинг - Лимиты</title>
      </Helmet>
      <GetBlockInfo page="operator_processing_limits" />
    </>
  );
}
