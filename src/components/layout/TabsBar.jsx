import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, SplitSquareHorizontal, Pin, PinOff, Trash2 } from 'lucide-react';
import useTabsStore from '../../store/useTabsStore';
import useNavigationStore from '../../store/useNavigationStore';
import { motion, AnimatePresence } from 'framer-motion';
import './TabsBar.css';

const TabsBar = () => {
  const { tabs, activeTabId, removeTab, setActiveTab, setSplitTab, togglePinTab } = useTabsStore();
  const { flatLinks } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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

  const handleContextMenu = (e, tabHref) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabHref
    });
  };

  const handleSplitView = (e) => {
    e.stopPropagation();
    if (contextMenu?.tabHref) {
      setSplitTab(contextMenu.tabHref);
    }
    setContextMenu(null);
  };

  const handleTogglePin = (e) => {
    e.stopPropagation();
    if (contextMenu?.tabHref) {
      togglePinTab(contextMenu.tabHref);
    }
    setContextMenu(null);
  };

  const handleCloseFromMenu = (e) => {
    e.stopPropagation();
    if (contextMenu?.tabHref) {
      handleCloseTab(e, contextMenu.tabHref);
    }
    setContextMenu(null);
  };

  if (tabs.length === 0) return null;

  // Sort tabs so pinned tabs appear first
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="tabs-bar-container">
      <div className="tabs-scroll-area" ref={scrollContainerRef}>
        <AnimatePresence initial={false}>
          {sortedTabs.map((tab) => {
            const isActive = activeTabId === tab.href;
            
            // Find icon from flatLinks
            const linkData = flatLinks.find(l => l.href === tab.href);
            const Icon = linkData?.icon;

            return (
              <motion.div
                key={tab.href}
                className={`tab-item ${isActive ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`}
                onClick={() => handleTabClick(tab.href)}
                onContextMenu={(e) => handleContextMenu(e, tab.href)}
                initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                animate={{ opacity: 1, width: tab.pinned ? 40 : 'auto', paddingLeft: 12, paddingRight: 12 }}
                exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, margin: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                layout
              >
                {Icon && <Icon size={14} className="tab-icon" />}
                {!tab.pinned && (
                  <>
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
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            className="tab-context-menu"
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 280), // Prevent overflow
              top: contextMenu.y
            }}
          >
            <button onClick={handleSplitView}>
              <SplitSquareHorizontal size={16} />
              Открыть параллельный просмотр
            </button>
            <button onClick={handleTogglePin}>
              {tabs.find(t => t.href === contextMenu.tabHref)?.pinned ? (
                <><PinOff size={16} /> Открепить вкладку</>
              ) : (
                <><Pin size={16} /> Закрепить вкладку</>
              )}
            </button>
            <div style={{ height: '1px', background: 'var(--border-color, #eaeaea)', margin: '4px 0' }} />
            <button onClick={handleCloseFromMenu} style={{ color: 'var(--error-color, #ff4d4f)' }}>
              <Trash2 size={16} />
              Закрыть вкладку
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TabsBar;
