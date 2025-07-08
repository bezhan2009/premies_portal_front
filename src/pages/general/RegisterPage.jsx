// src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/login.scss';
import LogoImageComponent from '../../components/Logo';
import Spinner from '../../components/Spinner';
import { Helmet } from 'react-helmet';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import { registerUser } from '../../api/auth';

const ROLES = [
    { id: 1, name: "Admin" },
    { id: 2, name: "Worker" },
    { id: 3, name: "Operator" },
    { id: 4, name: "Head" },
    { id: 5, name: "Director" },
    { id: 6, name: "Card Seller" },
    { id: 7, name: "Universal" },
    { id: 8, name: "Credit seller" },
];

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(6);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await registerUser({
                Username: username,
                Email: email,
                Phone: phone,
                full_name: fullName,
                Password: password,
                role_id: Number(roleId),
            });

            // Просто редирект без сохранения токенов
            navigate('/operator/reports', { replace: true });
        } catch (err) {
            if (err.message === "Failed to fetch") {
                setError('Сервис сейчас недоступен');
            } else {
                setError(err.message || 'Ошибка регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <>
            <Helmet>
                <title>Регистрация</title>
            </Helmet>
            <div className="login-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <div align="center" className='image-logo-login'>
                        <LogoImageComponent width={125} height={105} />
                    </div>

                    <label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder='Логин'
                            required
                        />
                    </label>

                    <label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='Email'
                            required
                        />
                    </label>

                    <label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder='Телефон'
                            required
                        />
                    </label>

                    <label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder='ФИО'
                            required
                        />
                    </label>

                    <label style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Пароль'
                            required
                        />
                        <button
                            type="button"
                            className='toggle-password-visibility'
                            onClick={togglePasswordVisibility}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </label>

                    <label>
                        <select
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            required
                        >
                            {ROLES.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {error && <div align="center" className="error">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? (
                            <div align="center">
                                <Spinner />
                            </div>
                        ) : (
                            'Зарегистрироваться'
                        )}
                    </button>
                </form>
            </div>
        </>
    );
}
