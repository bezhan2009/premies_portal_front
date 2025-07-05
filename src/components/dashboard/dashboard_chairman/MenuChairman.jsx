import '../../../styles/components/Menu.scss';
import LogoImageComponent from '../../Logo';
import LogoutButton from '../../general/Logout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function HeaderChairman({ username = 'Бартов М.', activeLink = 'reports' }) {
    const links = [
        { name: 'База знаний', href: '/chairman/knowledge-base', key: 'knowledge' },
        { name: 'Отчет по картам', href: '/chairman/reports', key: 'rep_cards' },
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
          Портал Activ Daily (Председатель): <strong>{username}</strong>
        </span>
                <LogoutButton />
            </div>
        </header>
    );
}
