import React from 'react';
import { AnimatePresence } from 'framer-motion';

import RenderPage from '../../RenderPage.jsx';
import ReportTableCardsChairman from "./table_reports/TableReportsCards.jsx";
import ReportTableOfficesChairman from "./table_reports/TableReportsOffice.jsx";
import ChairmanReportCardsBlockInfo from "../charts/CardCharts.jsx";
import ChairmanReportFinanceBlockInfo from "../charts/FinanceChart.jsx";
import UnderDevelopment from "../../general/UnderDevelopment.jsx";
import ChairmanOfficeParentComponent from "./ChairmanOfficeReportsParentComponent.jsx";
import ChairmanEmployeeParentComponent from "./ChairmanEmployeeReportsParentComponent.jsx";
import ChairmanAllParentComponent from "./ChairmanAllReportsParentComponent.jsx";


const ReportContent = ({ activeTab }) => {
    const getContent = () => {
        switch (activeTab) {
            case 'bank':
                return (
                    <RenderPage pageKey="bank">
                        <>
                            <ChairmanAllParentComponent />
                        </>
                    </RenderPage>
                );
            case 'branches':
                return (
                    <RenderPage pageKey="branches">
                        <ChairmanOfficeParentComponent />
                    </RenderPage>
                );
            case 'employees':
                return (
                    <RenderPage pageKey="employees">
                        <ChairmanEmployeeParentComponent />
                    </RenderPage>
                );
            default:
                return null;
        }
    };

    return <AnimatePresence mode="wait">{getContent()}</AnimatePresence>;
};

export default ReportContent;
