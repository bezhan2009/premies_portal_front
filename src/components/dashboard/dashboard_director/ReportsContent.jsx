import React from 'react';
import { AnimatePresence } from 'framer-motion';

import RenderPage from '../../RenderPage.jsx';
import DirectorAllParentComponent from "./DirectorAllReportsParentComponent.jsx";
import DirectorEmployeeParentComponent from "./DirectorEmployeeReportsParentComponent.jsx";


const ReportContent = ({ activeTab }) => {
    const getContent = () => {
        switch (activeTab) {
            case 'office':
                return (
                    <RenderPage pageKey="office">
                        <>
                            <DirectorAllParentComponent />
                        </>
                    </RenderPage>
                );
            case 'employees':
                return (
                    <RenderPage pageKey="employees">
                        <DirectorEmployeeParentComponent />
                    </RenderPage>
                );
            default:
                return null;
        }
    };

    return <AnimatePresence mode="wait">{getContent()}</AnimatePresence>;
};

export default ReportContent;
