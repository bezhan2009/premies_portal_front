import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardWorkerCards() {
  return (
    <>
      <Helmet>
        <title>Карты</title>
      </Helmet>
      <GetBlockInfo page="und" />
    </>
  );
}
