import React from "react"
import OperatorPremiBlockInfo from '../dashboard_operator/OperatorPremi'
import OperatorReportsBlockInfo from "../dashboard_operator/OperatorReports";
import OperatorDatasBlockInfo from "../dashboard_operator/OperatorDatas";
import OperatorKnowledgeBaseBlockInfo from "../dashboard_operator/OperatorKnowledgeBase";

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
        default:
            return null;
    }
}

export default GetBlockInfo;
