import '../../../styles/components/Menu.scss';
import LogoImageComponent from '../../Logo';
import LogoutButton from '../../general/Logout';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header({ activeLink = 'reports', activeSubLink = null }) {
  const username = localStorage.getItem('username') || 'Неизвестное имя';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isProcessingHovered, setIsProcessingHovered] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const links = [
    { name: 'Премии', href: '/operator/premies', key: 'premi' },
    { name: 'Отчеты', href: '/operator/reports', key: 'reports' },
    { name: 'Данные', href: '/operator/data', key: 'data' },
    { name: 'Тесты', href: '/operator/tests', key: 'tests' },
    { name: 'Процессинг', href: '/operator/processing/limits', key: 'processing' },
    { name: 'База знаний', href: '/operator/knowledge-base', key: 'knowledge' },
  ];

  const processingSubmenu = [
    { name: 'Лимиты', href: '/operator/processing/limits', key: 'limits', description: 'Управление лимитами карт' },
    // { name: 'Транзакции', href: '/operator/transactions', key: 'transactions', description: 'Мониторинг транзакций' },
    // { name: 'Мерчанты', href: '/operator/merchants', key: 'merchants', description: 'Управление мерчантами' },
    // { name: 'Эквайринг', href: '/operator/acquirings', key: 'acquirings', description: 'Настройки эквайринга' },
    // { name: 'Комиссии', href: '/operator/fees', key: 'fees', description: 'Настройка комиссий' },
    // { name: 'Отчеты процессинга', href: '/operator/processing-reports', key: 'processing-reports', description: 'Отчеты по операциям' },
  ];

  // Проверяем, активен ли пункт основного меню
  const isProcessingActive = activeLink === 'processing';

  // Проверяем, активен ли пункт подменю
  const isSubLinkActive = (subLinkKey) => {
    return isProcessingActive && activeSubLink === subLinkKey;
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsProcessingHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsProcessingHovered(false);
    }, 200);
  };

  const handleChangePassword = () => {
    setIsModalOpen(true);
    setModalError('');
    setOldPassword('');
    setNewPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.detail || 'Походу вы ввели не правильны пароль');
      }

      setIsModalOpen(false);
      alert('Пароль успешно изменен!');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
      <>
        <header className="header">
          <div className="header-left">
            <Link to="/">
              <LogoImageComponent width={75} height={65} />
            </Link>
            <nav className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              {links.map(link => (
                  link.key === 'processing' ? (
                      <div
                          key={link.key}
                          className="processing-menu-wrapper"
                          onMouseEnter={handleMouseEnter}
                          onMouseLeave={handleMouseLeave}
                          ref={dropdownRef}
                      >
                        <Link
                            to={link.href}
                            className={`processing-link ${isProcessingActive ? 'active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {link.name}
                          <svg className="dropdown-arrow" width="18" height="18" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          </svg>
                        </Link>

                        {isProcessingHovered && (
                            <div className="processing-dropdown">
                              <div className="dropdown-content">
                                {processingSubmenu.map((item, index) => (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`dropdown-item ${isSubLinkActive(item.key) ? 'dropdown-item--active' : ''}`}
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                        onClick={() => {
                                          setIsProcessingHovered(false);
                                          setIsMobileMenuOpen(false);
                                        }}
                                    >
                                      <div className="item-content">
                                        <span className="item-title">{item.name}</span>
                                        <span className="item-description">{item.description}</span>
                                      </div>
                                      <div className="item-arrow">
                                        {isSubLinkActive(item.key) ? '✓' : '→'}
                                      </div>
                                    </Link>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>
                  ) : (
                      <Link
                          key={link.key}
                          to={link.href}
                          className={link.key === activeLink ? 'active' : ''}
                          onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.name}
                      </Link>
                  )
              ))}
            </nav>
            <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span></span><span></span><span></span>
            </button>
          </div>
          <div className="header-right">
            <div className="username-wrapper">
            <span>
              Оператор: <strong>{username}</strong>
            </span>
              <button className="change-password-btn" onClick={handleChangePassword}>
                Изменить пароль
              </button>
            </div>
            <LogoutButton />
          </div>
        </header>

        {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Смена пароля</h3>
                <form onSubmit={handleSubmit}>
                  <label>
                    Старый пароль:
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                    />
                  </label>
                  <label>
                    Новый пароль:
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                  </label>
                  {modalError && <div className="modal-error">{modalError}</div>}
                  <div className="modal-buttons">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Сохраняю...' : 'Сменить пароль'}
                    </button>
                    <button type="button" onClick={() => setIsModalOpen(false)}>
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </>
  );
}
