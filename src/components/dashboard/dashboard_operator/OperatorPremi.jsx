import React from 'react'
import '../../../styles/components/BlockInfo.scss'
import Filters from '../../../components/dashboard/dashboard_general/Filters';
import TablePremies from '../../../components/dashboard/dashboard_operator/TablePremies';
import { AnimatePresence, motion } from 'framer-motion';


const renderTable = () => {
    const commonProps = {
      initial: { opacity: 0, x: 10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -10 },
      transition: { duration: 0.3 }
    };

    return (
        <motion.div key="mb" {...commonProps}>
            <Filters initialDate="2025-06-21" modificationDesc='Премии сотрудников' />
            <TablePremies />
        </motion.div>
    );
  };
  
const OperatorPremiBlockInfo = () => {
    return (
        <>
           <div className='block_info_prems' align='center'>
                <AnimatePresence mode="wait">
                    {renderTable()}
                </AnimatePresence>
           </div>
        </>
    )
}

export default OperatorPremiBlockInfo;

