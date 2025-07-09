import React from 'react';
import { motion } from 'framer-motion';

const commonProps = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
    transition: { duration: 0.3 }
};

const RenderPage = ({ children, pageKey }) => {
    return (
        <motion.div key={pageKey} {...commonProps}>
            {children}
        </motion.div>
    );
};

export default RenderPage;
