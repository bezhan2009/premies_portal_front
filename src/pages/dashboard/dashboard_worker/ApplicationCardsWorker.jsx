import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerApplicationCards() {
  return (
    <>
      <Helmet>
        <title>Кредиты</title>
      </Helmet>
      <GetBlockInfo page="und" />
    </>
  );
}
