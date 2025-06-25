import React from 'react';
import '../../../../styles/components/WorkersDataReports.scss';
import RenderPage from "../../../RenderPage.jsx";

const ReportsContent = ({ children }) => {
    return (
        <RenderPage>
            <div className="container">
                <div className="content">
                    {children}
                </div>
            </div>
        </RenderPage>
    );
};

export default ReportsContent;
