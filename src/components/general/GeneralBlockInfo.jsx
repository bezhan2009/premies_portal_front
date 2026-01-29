import React from "react";
import OperatorPremiBlockInfo from "../dashboard/dashboard_operator/OperatorPremi.jsx";
import OperatorReportsBlockInfo from "../dashboard/dashboard_operator/OperatorReports.jsx";
import OperatorDatasBlockInfo from "../dashboard/dashboard_operator/OperatorDatas.jsx";
import OperatorKnowledgeBaseBlockInfo from "../dashboard/dashboard_operator/OperatorKnowledgeBase.jsx";
import GeneralUnderDevelopment from "./UnderDevelopment.jsx";
import WorkerPremiesBlockInfo from "../dashboard/dashboard_worker/WorkerPremies.jsx";
import RenderReports from "../dashboard/dashboard_worker/reports_table/RenderReports.jsx";
import ChairmanReports from "../dashboard/dashboard_chairman/ChairmanReports.jsx";
import "../../styles/components/BlockInfo.scss";
import GeneralKnowledgeBaseBlockInfo from "../dashboard/dashboard_general/GeneralKnowledgeBase.jsx";
import OperatorTestsDashboard from "../dashboard/dashboard_operator/OperatorTestsPage.jsx";
import WorkerTestsPage from "../dashboard/dashboard_worker/WorkerTestsPage.jsx";
import WorkerApplicationsCards from "../dashboard/dashboard_worker/WorkerApplicationsCards.jsx";
import DirectorReports from "../dashboard/dashboard_director/DirectorReports.jsx";
import ProcessingIntegrationLimits from "../dashboard/dashboard_operator/processing/Limits.jsx";
import ProcessingIntegrationTransactions from "../dashboard/dashboard_operator/processing/Transactions.jsx";

const pageMap = {
  worker_knowledge_base: GeneralKnowledgeBaseBlockInfo,
  operator_premi: OperatorPremiBlockInfo,
  operator_reports: OperatorReportsBlockInfo,
  operator_data: OperatorDatasBlockInfo,
  operator_knowledge_base: OperatorKnowledgeBaseBlockInfo,
  operator_tests: OperatorTestsDashboard,
  operator_processing_limits: ProcessingIntegrationLimits,
  operator_processing_transactions: ProcessingIntegrationTransactions,
  worker_premi: WorkerPremiesBlockInfo,
  worker_report: RenderReports,
  worker_tests: WorkerTestsPage,
  application_cards_worker: WorkerApplicationsCards,
  chairman_reports: ChairmanReports,
  director_reports: DirectorReports,
};

function GetBlockInfo({ page }) {
  const Component = pageMap[page] || GeneralUnderDevelopment;
  return <Component />;
}

export default GetBlockInfo;
