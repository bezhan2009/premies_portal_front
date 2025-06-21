import React from "react"
import OperatorPremiBlockInfo from '../dashboard/dashboard_operator/OperatorPremi.jsx'
import OperatorReportsBlockInfo from "../dashboard/dashboard_operator/OperatorReports.jsx";
import OperatorDatasBlockInfo from "../dashboard/dashboard_operator/OperatorDatas.jsx";
import OperatorKnowledgeBaseBlockInfo from "../dashboard/dashboard_operator/OperatorKnowledgeBase.jsx";
import GeneralUnderDevelopment from "./UnderDevelopment.jsx";
import WorkerPremiesBlockInfo from "../dashboard/dashboard_worker/WorkerPremies.jsx";
import ChairmanReports from "../dashboard/dashboard_chairman/ChairmanReports.jsx";
import '../../styles/components/BlockInfo.scss'

function GetBlockInfo({ page }) {
    switch (page) {
        case "operator_premi":
            return <OperatorPremiBlockInfo />;
        case "operator_reports":
            return <OperatorReportsBlockInfo />;
        case "operator_data":
            return <OperatorDatasBlockInfo />;
        case "operator_knowledge_base":
            return <OperatorKnowledgeBaseBlockInfo />;
        case "worker_premi":
            return <WorkerPremiesBlockInfo />;
        case "chairman_reports":
            return <ChairmanReports />
        default:
            return <GeneralUnderDevelopment />;
    }
}

export default GetBlockInfo;
