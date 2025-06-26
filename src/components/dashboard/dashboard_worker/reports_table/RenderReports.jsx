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

    const renderComponent = () => {
        switch (activeComponent) {
            case 'mobileBank':
                return <MBReport />;
            case 'cards':
                return <CardsReport />
            case 'turnovers':
                return <CardTurnoversReport />;
            case 'kc':
                return <KCReport />;
            // case 'Овердрафт':
            //     return <OVReport />;
            default:
                return <UnderDevelopmentPage />; // Значение по умолчанию
        }
    };

    return (
        <div className="block_info_prems" align="center">
            <div className="header-reps">
                <ReportFilters onSelect={setActiveComponent} />
            </div>

            {renderComponent()}
            <ReportButton navigateTo='/worker/premies' descButton='Моя премия' />
        </div>
    );
};

export default RenderReports;
