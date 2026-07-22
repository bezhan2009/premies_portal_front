import { Helmet } from "react-helmet";
import LimitsChangeForm from "../../../components/dashboard/dashboard_operator/LimitsChangeForm.jsx";

export default function DashboardOperatorProcessing() {
  return (
    <>
      <Helmet>
        <title>Процессинг - Лимиты</title>
      </Helmet>
      <div style={{ padding: '40px 20px' }}>
         <LimitsChangeForm />
      </div>
    </>
  );
}
