import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Settings, MessageSquare, GraduationCap, X, User } from 'lucide-react';
import useNavigationStore from '../../store/useNavigationStore';
import useTabsStore from '../../store/useTabsStore';
import useChatStore from '../../store/useChatStore';
import useNotificationStore from '../../store/useNotificationStore';
import LogoImageComponent from '../Logo';
import LogoutButton from "../general/Logout.jsx";
import NotificationsDropdown from '../general/NotificationsDropdown.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const { flatLinks } = useNavigationStore();
  const { addTab } = useTabsStore();
  const { openMiniChat } = useChatStore();
  const { unreadCount, connect, disconnect } = useNotificationStore();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Connect to global notifications WebSocket
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

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
  const handleChangePassword = () => window.dispatchEvent(new CustomEvent('open-change-password'));

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label="Toggle Menu">
          <Menu size={22} />
        </button>
        <div className="header-logo">
          <LogoImageComponent width={110} height={"auto"} />
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
        <button className="icon-btn" aria-label="Knowledge Base" onClick={() => navigate('/user/knowledge-base')} title="База знаний">
          <GraduationCap size={22} />
        </button>
        <button className="icon-btn" aria-label="Mini Chat" onClick={handleOpenMiniChat} title="Мини-чат">
          <MessageSquare size={22} />
        </button>
        <button className="icon-btn" aria-label="Settings" onClick={handleOpenSettings} title="Настройки интерфейса">
          <Settings size={22} />
        </button>
        <button className="icon-btn" aria-label="Profile" onClick={handleOpenProfile} title="Мой профиль">
          <User size={22} />
        </button>
        <div style={{ position: 'relative' }}>
          <button 
            className="icon-btn notification-btn" 
            aria-label="Notifications" 
            onClick={(e) => { e.stopPropagation(); setIsNotificationsOpen(!isNotificationsOpen); }}
            title="Уведомления"
          >
            <Bell size={22} />
            {unreadCount > 0 && <span className="notification-badge"></span>}
          </button>
          <NotificationsDropdown 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
          <LogoutButton iconSize={{ width: 22, height: 22 }} />
        </div>
      </div>
    </header>
  );
};

export default Header;
