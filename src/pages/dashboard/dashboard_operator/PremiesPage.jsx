import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorPremies() {
  return (
    <>
      <Helmet>
        <title>Моя премия</title>
      </Helmet>
      <GetBlockInfo page="operator_premi" />
    </>
  );
}
