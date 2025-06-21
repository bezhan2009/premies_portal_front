import '../../../styles/components/Menu.scss';
import LogoImageComponent from '../../Logo';
import LogoutButton from '../../general/Logout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Header({ username = 'Бартов М.', activeLink = 'reports' }) {
  const links = [
    { name: 'Премии', href: '/operator/premies', key: 'premi' },
    { name: 'Отчеты', href: '/operator/reports', key: 'reports' },
    { name: 'Данные', href: '/operator/data', key: 'data' },
    { name: 'База знаний', href: '/operator/knowledge-base', key: 'knowledge' },
  ];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/">
          <LogoImageComponent width={75} height={50} />
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
          Портал Activ Daily (Оператор): <strong>{username}</strong>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
