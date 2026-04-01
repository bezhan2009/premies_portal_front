import { Helmet } from "react-helmet";
import ABSClientSearch from "../../../components/dashboard/dashboard_frontovik/ABSSearch.jsx";

export default function DashboardFrontovikAbsSearch() {
  return (
    <>
      <Helmet>
        <title>Поиск по АБС</title>
      </Helmet>
      <ABSClientSearch />
    </>
  );
}
