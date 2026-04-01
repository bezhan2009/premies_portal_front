import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerCredits() {
  return (
    <>
      <Helmet>
        <title>Кредиты</title>
      </Helmet>
      <GetBlockInfo page="und" />
    </>
  );
}
