import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/login.scss';
import '../../styles/extraForm.scss';
import LogoImageComponent from '../../components/Logo';
import Spinner from '../../components/Spinner';
import { Helmet } from 'react-helmet';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';

import { registerUser } from '../../api/auth';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [salary, setSalary] = useState('');
    const [position, setPosition] = useState('');
    const [plan, setPlan] = useState('');
    const [salaryProject, setSalaryProject] = useState('');
    const [placeWork, setPlaceWork] = useState('');
    const [offices, setOffices] = useState([]);

    const [officeTitle, setOfficeTitle] = useState('');
    const [officeCode, setOfficeCode] = useState('');
    const [officeDesc, setOfficeDesc] = useState('');

    const [roles, setRoles] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);

    const token = localStorage.getItem('access_token');
    const navigate = useNavigate();

    // Функция для возврата на предыдущую страницу
    const handleGoBack = () => {
        navigate(-1);
    };

    // Загрузка ролей из API
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
                }

                const rolesData = await response.json();
                setRoles(rolesData);
            } catch (err) {
                console.error('Ошибка загрузки ролей:', err);
                setError('Не удалось загрузить список ролей');
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRoles();
    }, [token]);

    const handleRoleChange = (e, roleId) => {
        if (e.target.checked) {
            if ((roleId === 6 && selectedRoles.includes(8)) || (roleId === 8 && selectedRoles.includes(6))) {
                setError("Нельзя выбрать обе роли: Карточник и Кредитник");
                return;
            }
            setSelectedRoles([...selectedRoles, roleId]);
        } else {
            setSelectedRoles(selectedRoles.filter(id => id !== roleId));
        }
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (selectedRoles.length === 0) {
            setError('Выберите хотя бы одну роль');
            return;
        }
        if (selectedRoles.includes(6) && selectedRoles.includes(8)) {
            setError('Нельзя выбрать обе роли: Карточник и Кредитник');
            return;
        }
        setLoading(true);

        const payload = {
            Username: username,
            Email: email,
            Phone: phone,
            full_name: fullName,
            Password: password,
            role_ids: selectedRoles,
        };

        const hasEmployeeRole = selectedRoles.some(r => [6, 8].includes(r));
        if (hasEmployeeRole) {
            payload.Salary = Number(salary);
            payload.position = position;
            payload.plan = Number(plan);
            payload.salary_project = Number(salaryProject);
            payload.place_work = placeWork;
        }

        if (selectedRoles.includes(5)) {
            payload.office_title = officeTitle;
            payload.office_desc = officeDesc;
            payload.office_code = officeCode;
        }

        try {
            await registerUser(payload);
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

    useEffect(() => {
        const hasEmployeeRole = selectedRoles.some(r => [6, 8].includes(r));
        if (hasEmployeeRole && offices.length === 0) {
            fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (Array.isArray(data)) {
                        const titles = data.map(item => item.title);
                        setOffices(titles);
                    } else {
                        console.error('Сервер вернул не массив:', data);
                    }
                })
                .catch(err => console.error('Ошибка загрузки офисов:', err));
        }
    }, [selectedRoles, token, offices.length]);

    return (
        <>
            <Helmet>
                <title>Регистрация</title>
            </Helmet>

            {/* Кнопка "Назад" в левом верхнем углу */}
            <button
                className="back-button"
                onClick={handleGoBack}
                aria-label="Назад"
                title="Назад"
            >
                <FaArrowLeft />
            </button>

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

                    <div className="roles-selection">
                        <p>Роли:</p>
                        {loadingRoles ? (
                            <p>Загрузка ролей...</p>
                        ) : (
                            roles.map(role => (
                                <div key={role.ID}>
                                    <input
                                        className='custom-checkbox'
                                        type="checkbox"
                                        id={`role-${role.ID}`}
                                        checked={selectedRoles.includes(role.ID)}
                                        onChange={(e) => handleRoleChange(e, role.ID)}
                                        disabled={loadingRoles}
                                    />
                                    <label htmlFor={`role-${role.ID}`}>{role.Name}</label>
                                </div>
                            ))
                        )}
                    </div>

                    {selectedRoles.some(r => [6, 8].includes(r)) && (
                        <div className="extra-form visible">
                            <label>
                                <input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    placeholder="Сумма оклада"
                                    required
                                />
                            </label>
                            <label>
                                <input
                                    type="text"
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    placeholder="Позиция"
                                    required
                                />
                            </label>
                            <label>
                                <input
                                    type="number"
                                    value={plan}
                                    onChange={(e) => setPlan(e.target.value)}
                                    placeholder="План"
                                    required
                                />
                            </label>
                            <label>
                                <input
                                    type="number"
                                    value={salaryProject}
                                    onChange={(e) => setSalaryProject(e.target.value)}
                                    placeholder="ЗП проект"
                                    required
                                />
                            </label>
                            <label>
                                <select
                                    value={placeWork}
                                    onChange={(e) => setPlaceWork(e.target.value)}
                                    required
                                >
                                    <option value="">Выберите место работы</option>
                                    {offices.map((title, idx) => (
                                        <option key={idx} value={title}>
                                            {title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}

                    {selectedRoles.includes(5) && (
                        <div className="extra-form visible">
                            <label>
                                <input
                                    type="text"
                                    value={officeTitle}
                                    onChange={(e) => setOfficeTitle(e.target.value)}
                                    placeholder="Название офиса"
                                    required
                                />
                            </label>
                            <label>
                                <input
                                    type="text"
                                    value={officeCode}
                                    onChange={(e) => setOfficeCode(e.target.value)}
                                    placeholder="Код офиса"
                                    required
                                />
                            </label>
                            <label>
                                <textarea
                                    value={officeDesc}
                                    onChange={(e) => setOfficeDesc(e.target.value)}
                                    placeholder="Описание офиса"
                                    required
                                    rows={3}
                                />
                            </label>
                        </div>
                    )}

                    {error && <div align="center" className="error">{error}</div>}

                    <button type="submit" disabled={loading || loadingRoles}>
                        {loading ? (
                            <div align="center">
                                <Spinner />
                            </div>
                        ) : (
                            'Зарегистрировать'
                        )}
                    </button>
                </form>
            </div>
        </>
    );
}
