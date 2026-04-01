import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardChairmanReports() {
  return (
    <>
      <Helmet>
        <title>Карты</title>
      </Helmet>
      <GetBlockInfo page="chairman_reports" />
    </>
  );
}
