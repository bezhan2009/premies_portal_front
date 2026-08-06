import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import useTabsStore from '../../store/useTabsStore';
import useNavigationStore from '../../store/useNavigationStore';
import { motion, AnimatePresence } from 'framer-motion';
import './TabsBar.css';

const TabsBar = () => {
  const { tabs, activeTabId, removeTab, setActiveTab } = useTabsStore();
  const { flatLinks } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);

  // Sync active tab with location.pathname if it changes externally
  useEffect(() => {
    if (activeTabId !== location.pathname) {
      // Find if we have a tab for this path
      const existingTab = tabs.find(t => t.href === location.pathname);
      if (existingTab) {
        setActiveTab(location.pathname);
      }
    }
  }, [location.pathname, activeTabId, tabs, setActiveTab]);

  const handleTabClick = (tabHref) => {
    if (activeTabId !== tabHref) {
      setActiveTab(tabHref);
      navigate(tabHref);
    }
  };

  const handleCloseTab = (e, tabHref) => {
    e.stopPropagation();
    removeTab(tabHref);
    
    // If the closed tab was active, the store handles falling back to the previous one
    // But we need to navigate to that new active tab. 
    // We can do this by using the store's current activeTabId after removeTab executes.
    setTimeout(() => {
      const newActive = useTabsStore.getState().activeTabId;
      if (newActive && newActive !== location.pathname) {
        navigate(newActive);
      } else if (!newActive) {
        // If no tabs left, go to dashboard
        navigate('/');
      }
    }, 0);
  };

  // Auto-scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('.tab-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId, tabs.length]);

  if (tabs.length === 0) return null;

  return (
    <div className="tabs-bar-container">
      <div className="tabs-scroll-area" ref={scrollContainerRef}>
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.href;
            
            // Find icon from flatLinks
            const linkData = flatLinks.find(l => l.href === tab.href);
            const Icon = linkData?.icon;

            return (
              <motion.div
                key={tab.href}
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.href)}
                initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                animate={{ opacity: 1, width: 'auto', paddingLeft: 16, paddingRight: 16 }}
                exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, margin: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                layout
              >
                {Icon && <Icon size={14} className="tab-icon" />}
                <span className="tab-title" title={tab.name}>
                  {tab.name}
                </span>
                
                <button 
                  className="tab-close-btn" 
                  onClick={(e) => handleCloseTab(e, tab.href)}
                  aria-label="Close Tab"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabsBar;
