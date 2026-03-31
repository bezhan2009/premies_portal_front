import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerTests() {
  return (
    <>
      <Helmet>
        <title>Тесты</title>
      </Helmet>
      <GetBlockInfo page="worker_tests" />
    </>
  );
}
