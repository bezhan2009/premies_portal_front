import React from "react"
import OperatorPremiBlockInfo from '../dashboard/dashboard_operator/OperatorPremi.jsx'
import OperatorReportsBlockInfo from "../dashboard/dashboard_operator/OperatorReports.jsx";
import OperatorDatasBlockInfo from "../dashboard/dashboard_operator/OperatorDatas.jsx";
import OperatorKnowledgeBaseBlockInfo from "../dashboard/dashboard_operator/OperatorKnowledgeBase.jsx";
import GeneralUnderDevelopment from "./UnderDevelopment.jsx";
import WorkerPremiesBlockInfo from "../dashboard/dashboard_worker/WorkerPremies.jsx";
import RenderReports from "../dashboard/dashboard_worker/reports_table/RenderReports.jsx";
import ChairmanReports from "../dashboard/dashboard_chairman/ChairmanReports.jsx";
import '../../styles/components/BlockInfo.scss'
import GeneralKnowledgeBaseBlockInfo from "../dashboard/dashboard_general/GeneralKnowledgeBase.jsx";
import OperatorTestsDashboard from "../dashboard/dashboard_operator/OperatorTestsPage.jsx";
import WorkerTestsPage from "../dashboard/dashboard_worker/WorkerTestsPage.jsx";
import WorkerApplicationsCards from "../dashboard/dashboard_worker/WorkerApplicationsCards.jsx";
import DirectorReports from "../dashboard/dashboard_director/DirectorReports.jsx";
import ProcessingIntegration from "../dashboard/dashboard_operator/processing/Limits.jsx";

function GetBlockInfo({ page }) {
    switch (page) {
        case "worker_knowledge_base":
            return <GeneralKnowledgeBaseBlockInfo />;
        case "operator_premi":
            return <OperatorPremiBlockInfo />;
        case "operator_reports":
            return <OperatorReportsBlockInfo />;
        case "operator_data":
            return <OperatorDatasBlockInfo />;
        case "operator_knowledge_base":
            return <OperatorKnowledgeBaseBlockInfo />;
        case "operator_tests":
            return <OperatorTestsDashboard />;
        case "operator_processing":
            return <ProcessingIntegration />
        case "worker_premi":
            return <WorkerPremiesBlockInfo />;
        case "worker_report":
            return <RenderReports />;
        case "worker_tests":
            return <WorkerTestsPage />;
        case "application_cards_worker":
            return <WorkerApplicationsCards />
        case "chairman_reports":
            return <ChairmanReports />
        case "director_reports":
            return <DirectorReports />
        default:
            return <GeneralUnderDevelopment />;
    }
}

export default GetBlockInfo;
