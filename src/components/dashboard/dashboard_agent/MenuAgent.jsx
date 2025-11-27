import '../../../styles/components/Menu.scss';
import LogoImageComponent from '../../Logo';
import LogoutButton from '../../general/Logout';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from "../../../api/application/wsnotifications.js";
import AlertMessage from "../../general/AlertMessage.jsx";

export default function HeaderAgent({ activeLink = 'reports' }) {
    const username = localStorage.getItem('username') || 'Неизвестное имя';
    const [hasNewApplications, setHasNewApplications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [modalError, setModalError] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "info" });

    // WebSocket для новых заявок
    const wsUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + '/applications/portal';

    const handleNewApplication = useCallback((newApplication) => {
        console.log('Новая заявка в хедере:', newApplication);
        
        // Устанавливаем красную точку
        setHasNewApplications(true);

        // Показываем всплывающее уведомление, если пользователь не на странице заявок
        if (activeLink !== 'applications') {
            setAlert({
                show: true,
                message: `Новая заявка #${newApplication.ID} от ${newApplication.request_сreator}`,
                type: "info"
                });
        }
    }, [activeLink]);

    useWebSocket(wsUrl, handleNewApplication, [activeLink]);

    const links = [
        { name: 'Карта', href: '/agent/card', key: 'gift_card' },
        { 
            name: 'Заявки', 
            href: '/agent/applications-list', 
            key: 'applications',
            hasNotification: hasNewApplications 
        },
        { name: 'База знаний', href: '/agent/knowledge-base', key: 'knowledge' },
    ];

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
                throw new Error(errorData?.detail || 'Походу вы ввели неправильный пароль');
            }

            setIsModalOpen(false);
            alert('Пароль успешно изменен!');
        } catch (err) {
            setModalError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Сбрасываем уведомление при клике на ссылку заявок
    const handleApplicationsClick = () => {
        setHasNewApplications(false);
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <header className="header">
                {/* Всплывающее уведомление о новой заявке */}
                {alert.show && (
                    <AlertMessage
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert({ ...alert, show: false })}
                        duration={5000}
                    />
                )}

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
                                onClick={link.key === 'applications' ? handleApplicationsClick : () => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                                {link.hasNotification && <span className="notification-dot"></span>}
                            </Link>
                        ))}
                    </nav>
                    <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <span></span><span></span><span></span>
                    </button>
                </div>
                <div className="header-right">
                    <div className="username-wrapper">
                        <span>
                          Директор: <strong>{username}</strong>
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
