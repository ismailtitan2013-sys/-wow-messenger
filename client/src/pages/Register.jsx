import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!formData.username || !formData.password) {
      setError('Заполните все поля');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validate()) return;
    
    setIsLoading(true);

    const result = await register(formData.username, formData.password);
    if (result.success) {
      // После успешной регистрации перенаправляем сразу в чат
      navigate('/');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Регистрация</h1>
          <p>Создайте аккаунт в WoW Messenger</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input 
              type="text" 
              name="username"
              className="form-control" 
              placeholder="JohnDoe"
              value={formData.username}
              onChange={handleChange}
            />
          </div>


          <div className="form-group">
            <label>Пароль</label>
            <input 
              type="password" 
              name="password"
              className="form-control" 
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? <span className="loader"></span> : 'Создать аккаунт'}
          </button>
        </form>
        
        <div className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
