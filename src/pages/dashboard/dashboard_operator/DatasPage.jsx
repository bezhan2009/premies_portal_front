import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorDatas() {
  return (
    <>
      <Helmet>
        <title>Выгрузка данных</title>
      </Helmet>
      <GetBlockInfo page="operator_data_unloading" />
    </>
  );
}
