import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardDirectorReports() {
  return (
    <>
      <Helmet>
        <title>Мой оффис</title>
      </Helmet>
      <GetBlockInfo page="director_reports" />
    </>
  );
}
