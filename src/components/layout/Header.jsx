import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Settings, MessageSquare, GraduationCap, X, User, Share2 } from 'lucide-react';
import useNavigationStore from '../../store/useNavigationStore';
import useTabsStore from '../../store/useTabsStore';
import useChatStore from '../../store/useChatStore';
import useNotificationStore from '../../store/useNotificationStore';
import LogoImageComponent from '../Logo';
import LogoutButton from "../general/Logout.jsx";
import NotificationsDropdown from '../general/NotificationsDropdown.jsx';
import { useLiveWorkflow } from '../live-workflow/LiveWorkflowProvider.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const normalizeSearchText = (value = '') => String(value)
  .toLocaleLowerCase('ru-RU')
  .replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9]+/gi, ' ')
  .trim();

const SEARCH_SCOPES = [
  { name: 'Искать в заявках', href: '/agent/applications-list', param: 'search', description: 'ФИО, телефон, ID, карта, офис' },
  { name: 'Искать среди клиентов', href: '/customers', param: 'search', description: 'ФИО, ИНН, телефон, индекс клиента' },
  { name: 'Открыть поиск во Фронтовике', href: '/frontovik/abs-search', param: 'clientIndex', description: 'Индекс клиента и продукты в АБС' },
  { name: 'Искать транзакции', href: '/processing-search/transactions', param: 'search', description: 'Карта, сумма, RRN и другие поля' },
];

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const { flatLinks } = useNavigationStore();
  const { addTab } = useTabsStore();
  const { toggleMiniChat } = useChatStore();
  const { unreadCount, connect, disconnect } = useNotificationStore();
  const { session: liveWorkflowSession, openShareDialog } = useLiveWorkflow();
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

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const pages = flatLinks
      .map((link) => {
        const haystack = normalizeSearchText(`${link.name || ''} ${link.key || ''} ${link.href || ''} ${link.parentName || ''}`);
        if (!tokens.every((token) => haystack.includes(token))) return null;
        const name = normalizeSearchText(link.name);
        const score = name === normalizedQuery ? 100 : name.startsWith(normalizedQuery) ? 70 : name.includes(normalizedQuery) ? 50 : 20;
        return { ...link, score, kind: 'page', description: link.parentName || 'Раздел портала' };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
    const scopes = SEARCH_SCOPES.map((scope) => ({ ...scope, kind: 'scope', query: searchQuery.trim() }));
    return [...pages, ...scopes].slice(0, 10);
  }, [flatLinks, searchQuery]);

  const handleResultClick = (result) => {
    const href = result.kind === 'scope'
      ? `${result.href}?${result.param || 'search'}=${encodeURIComponent(result.query)}`
      : result.href;
    addTab({ href, name: result.name });
    navigate(href);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleOpenSettings = () => navigate('/settings');
  const handleOpenProfile = () => window.dispatchEvent(new CustomEvent('open-profile'));

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label="Toggle Menu">
          <Menu size={22} />
        </button>
        <div className="header-logo">
          <LogoImageComponent width={145} height={"auto"} />
        </div>
      </div>

      <div className="header-center" ref={searchRef}>
        <div className={`search-container ${isSearchFocused ? 'focused' : ''}`}>
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Поиск по порталу, клиентам, заявкам и операциям…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) handleResultClick(searchResults[0]);
              if (event.key === 'Escape') setIsSearchFocused(false);
            }}
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
                  <span className="result-copy">
                    <span className="result-name">{result.name}</span>
                    <span className="result-description">{result.description}</span>
                  </span>
                  <span className="result-path">{result.kind === 'scope' ? 'Поиск' : result.href}</span>
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
        <button className="icon-btn" aria-label="Mini Chat" onClick={toggleMiniChat} title="Мини-чат">
          <MessageSquare size={22} />
        </button>
        <button
          className={`icon-btn live-share-header-btn ${liveWorkflowSession ? 'active' : ''}`}
          aria-label="Share workflow"
          onClick={openShareDialog}
          title="Поделиться workflow"
        >
          <Share2 size={21} />
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
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
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
