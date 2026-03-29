import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorTests() {
  return (
    <>
      <Helmet>
        <title>Тесты</title>
      </Helmet>
      <GetBlockInfo page="operator_tests" />
    </>
  );
}
