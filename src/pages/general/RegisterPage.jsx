import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/login.scss';
import '../../styles/extraForm.scss';
import LogoImageComponent from '../../components/Logo';
import Spinner from '../../components/Spinner';
import { Helmet } from 'react-helmet';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import { registerUser } from '../../api/auth';

const ROLES = [
    { id: 3, name: "Operator" },
    { id: 5, name: "Director" },
    { id: 6, name: "Card Seller" },
    { id: 8, name: "Credit Seller" },
    { id: 9, name: "Chairman" },
];

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(3); // Operator по умолчанию
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
    const [officeDesc, setOfficeDesc] = useState('');

    const token = localStorage.getItem('access_token');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const payload = {
            Username: username,
            Email: email,
            Phone: phone,
            full_name: fullName,
            Password: password,
            role_id: roleId,
        };

        if (roleId === 6 || roleId === 8) {
            payload.Salary = Number(salary);
            payload.position = position;
            payload.plan = Number(plan);
            payload.salary_project = Number(salaryProject);
            payload.place_work = placeWork;
        }

        if (roleId === 5) {
            payload.office_title = officeTitle;
            payload.office_desc = officeDesc;
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
        if ((roleId === 6 || roleId === 8) && offices.length === 0) {
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
    }, [roleId, token, offices.length]);

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
                            onChange={(e) => setRoleId(Number(e.target.value))}
                            required
                        >
                            {ROLES.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {(roleId === 6 || roleId === 8) && (
                        <div className="extra-form visible">
                            <label>
                                <input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    placeholder="Сумма оклада"
                                />
                            </label>
                            <label>
                                <input
                                    type="text"
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    placeholder="Позиция"
                                />
                            </label>
                            <label>
                                <input
                                    type="number"
                                    value={plan}
                                    onChange={(e) => setPlan(e.target.value)}
                                    placeholder="План"
                                />
                            </label>
                            <label>
                                <input
                                    type="number"
                                    value={salaryProject}
                                    onChange={(e) => setSalaryProject(e.target.value)}
                                    placeholder="ЗП проект"
                                />
                            </label>
                            <label>
                                <select
                                    value={placeWork}
                                    onChange={(e) => setPlaceWork(e.target.value)}
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

                    {roleId === 5 && (
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

                    <button type="submit" disabled={loading}>
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
