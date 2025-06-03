import { useState } from 'react';
import '../styles/login.scss';
import LogoImageComponent from '../components/Logo';
import Spinner from '../components/Spinner';
import { login } from '../api/auth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const [username, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      console.log('Logged in:', data);

      // сохраняем токены
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // переадресуем
      window.location.href = '/dashboard'; // или с router.navigate
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
       setShowPassword(!showPassword);
  };

    
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div align="center" className='image-logo-login'>
          <LogoImageComponent />
        </div>

        <label>
          <input
            type="text"
            value={username}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Логин'
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

        {error && <div className="error">{error}</div>}

        
        <button type="submit" disabled={loading}>
          {loading ? (
            <div align="center">
              <Spinner />
            </div>
          ) : (
            'Войти'
          )}
        </button>

      </form>
    </div>
  );
}
