import '../../../styles/components/Menu.scss';
import LogoImageComponent from '../../Logo';
import LogoutButton from '../../general/Logout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function HeaderWorker({ username = 'Бартов М.', activeLink = 'cards' }) {
  const links = [
    { name: 'Карты', href: '/worker/cards', key: 'cards' },
    { name: 'Кредиты', href: '/worker/credits', key: 'credits' },
    { name: 'Тесты', href: '/worker/tests', key: 'tests' },
    { name: 'База знаний', href: '/worker/knowledge-base', key: 'knowledge' },
    { name: 'Моя премия', href: '/worker/premies', key: 'premies' },
  ];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/">
          <LogoImageComponent width={75} height={65} />
        </Link>
        <nav className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {links.map(link => (
            <Link
              key={link.key}
              to={link.href}
              className={link.key === activeLink ? 'active' : ''}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className="header-right">
        <span>
          Портал Daily: <strong>{username}</strong>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
