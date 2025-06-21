import React from 'react'
import '../../styles/components/BlockInfo.scss'
import UnderDevelopmentPage from '../dashboard/dashboard_general/UnderDevelopment';
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
            <UnderDevelopmentPage />
        </motion.div>
    );
  };
  
const GeneralUnderDevelopment = () => {
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

export default GeneralUnderDevelopment;

