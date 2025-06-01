import { useState } from 'react';
import '../styles/login.scss';
import LogoImageComponent from '../components/Logo';
import Button from '../components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password });
    // позже подключим API
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Вход</h2>
        <div align="center">
            <LogoImageComponent />
        </div>

        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Пароль:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

      <Button onClick={handleSubmit}>
        Войти
      </Button>
      </form>
    </div>
  );
}
