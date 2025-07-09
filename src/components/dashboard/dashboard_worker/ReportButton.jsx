import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/components/ReportButton.scss';

const ReportButton = ({ navigateTo, descButton }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(navigateTo);
    };

    return (
        <button className="report-button" onClick={handleClick}>
            {descButton}
        </button>
    );
};

export default ReportButton;
