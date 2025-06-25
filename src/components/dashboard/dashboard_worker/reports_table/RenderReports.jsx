import React from 'react';
import ReportFilters from "./ReportFilters.jsx";
import '../../../../styles/components/WorkersDataReports.scss';
import MBReport from "./MobileBankReports.jsx";
import CardTurnoversReport from "./CardTurnover.jsx";
import CardsReport from "./CardsReport.jsx";
import UnderDevelopmentPage from "../../dashboard_general/UnderDevelopment.jsx";


const RenderReports = () => {
    const [activeComponent, setActiveComponent] = React.useState('Мобильный банк');

    const renderComponent = () => {
        switch (activeComponent) {
            case 'карты':
                return <CardsReport />
            case 'мб':
                return <MBReport />;
            case 'обороты':
                return <CardTurnoversReport />;
            // case 'Овердрафт':
            //     return <OVReport />;
            default:
                return <UnderDevelopmentPage />; // Значение по умолчанию
        }
    };

    return (
        <div className="block_info_prems" align="center">
            <div className="container">
                <ReportFilters onSelect={setActiveComponent} />
                <div className="content">
                    {renderComponent()}
                </div>
            </div>
        </div>
    );
};

export default RenderReports;
