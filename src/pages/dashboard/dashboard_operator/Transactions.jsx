import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorProcessingTransactions() {
    return (
        <>
            <Helmet>
                <title>Процессинг - Транзакции</title>
            </Helmet>
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <Header activeLink="processing" activeSubLink="transactions" />
                </header>
                <GetBlockInfo page="operator_processing_transactions" />
            </div>
        </>
    );
}
