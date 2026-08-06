import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Settings, MessageSquare, GraduationCap, X } from 'lucide-react';
import useNavigationStore from '../../store/useNavigationStore';
import useTabsStore from '../../store/useTabsStore';
import useChatStore from '../../store/useChatStore';
import LogoImageComponent from '../Logo';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { flatLinks } = useNavigationStore();
  const { addTab } = useTabsStore();
  const { openMiniChat } = useChatStore();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim() === '' ? [] : flatLinks.filter(link => 
    link.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8); // limit to 8 results

  const handleResultClick = (result) => {
    addTab({ href: result.href, name: result.name });
    navigate(result.href);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleOpenMiniChat = () => {
    openMiniChat();
  };

  const handleOpenSettings = () => window.dispatchEvent(new CustomEvent('open-settings'));
  const handleOpenProfile = () => window.dispatchEvent(new CustomEvent('open-profile'));

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label="Toggle Menu">
          <Menu size={24} />
        </button>
        <div className="header-logo">
          <LogoImageComponent width={42} height={36} />
        </div>
      </div>

      <div className="header-center" ref={searchRef}>
        <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search functionality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <AnimatePresence>
          {isSearchFocused && searchResults.length > 0 && (
            <motion.div 
              className="search-dropdown"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {searchResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <Search size={16} className="result-icon" />
                  <span className="result-name">{result.name}</span>
                  <span className="result-path">{result.href}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="header-right">
        <button className="icon-btn" aria-label="Courses">
          <GraduationCap size={22} />
        </button>
        <button className="icon-btn" aria-label="Mini Chat" onClick={handleOpenMiniChat}>
          <MessageSquare size={22} />
        </button>
        <button className="icon-btn" aria-label="Settings" onClick={handleOpenSettings}>
          <Settings size={22} />
        </button>
        <button className="icon-btn notification-btn" aria-label="Notifications">
          <Bell size={22} />
          <span className="notification-badge"></span>
        </button>
        <div className="user-avatar" onClick={handleOpenProfile}>
          <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
        </div>
      </div>
    </header>
  );
};

export default Header;
