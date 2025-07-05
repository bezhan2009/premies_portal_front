// RenderReports.jsx
import React from 'react';
import ReportFilters from "./ReportFilters.jsx";
import '../../../../styles/components/WorkersDataReports.scss';
import MBReport from "./MobileBankReports.jsx";
import CardTurnoversReport from "./CardTurnover.jsx";
import CardsReport from "./CardsReport.jsx";
import UnderDevelopmentPage from "../../dashboard_general/UnderDevelopment.jsx";
import KCReport from "./KCReport.jsx";
import ReportButton from "../ReportButton.jsx";

const RenderReports = () => {
    const [activeComponent, setActiveComponent] = React.useState("cards");
    const [month, setMonth] = React.useState(new Date().getMonth() + 1);
    const [year, setYear] = React.useState(new Date().getFullYear());

    const handleDateChange = (month, year) => {
        setMonth(month);
        setYear(year);
    };

    const renderComponent = () => {
        switch (activeComponent) {
            case 'mobileBank':
                return <MBReport month={month} year={year} />;
            case 'cards':
                return <CardsReport month={month} year={year} />;
            case 'turnovers':
                return <CardTurnoversReport month={month} year={year} />;
            case 'kc':
                return <KCReport month={month} year={year} />;
            default:
                return <UnderDevelopmentPage />;
        }
    };

    return (
        <div className="block_info_prems" align="center">
            <div className="header-reps">
                <ReportFilters
                    onSelect={setActiveComponent}
                    onDateChange={handleDateChange}
                />
            </div>
            {renderComponent()}
            <ReportButton navigateTo='/worker/premies' descButton='Моя премия' />
        </div>
    );
};

export default RenderReports;
