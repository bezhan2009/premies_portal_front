import React, { useState } from 'react';
import '../../../styles/components/BlockInfo.scss';
import Filters from '../../../components/dashboard/dashboard_general/Filters';
import TablePremies from '../../../components/dashboard/dashboard_operator/TablePremies';
import { AnimatePresence, motion } from 'framer-motion';

const OperatorPremiBlockInfo = () => {
    const [filterDate, setFilterDate] = useState({ month: 6, year: 2025 }); // по умолчанию июнь 2025

    const handleDateChange = (newDate) => {
        setFilterDate(newDate); // { month: 5, year: 2025 }
    };

    const commonProps = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 },
        transition: { duration: 0.3 },
    };

    return (
        <div className="block_info_prems" align="center">
            <Filters
                initialDate="2025-06-21"
                modificationDesc="Премии сотрудников"
                onChange={handleDateChange}
            />
            <AnimatePresence mode="wait">
                <motion.div key={`${filterDate.month}-${filterDate.year}`} {...commonProps}>
                    <TablePremies month={filterDate.month} year={filterDate.year} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default OperatorPremiBlockInfo;
