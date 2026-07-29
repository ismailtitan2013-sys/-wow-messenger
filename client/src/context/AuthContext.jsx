import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wow_token') || null);
  const [loading, setLoading] = useState(true);

  // Настройка axios — в продакшене API на том же домене, в деве на localhost:5000
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    // В реальном проекте здесь должен быть запрос /api/auth/me для проверки токена
    // Для демо мы просто читаем из localStorage
    const storedUser = localStorage.getItem('wow_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    } else {
      setToken(null);
      setUser(null);
      localStorage.removeItem('wow_token');
      localStorage.removeItem('wow_user');
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { token, user } = res.data;
      
      localStorage.setItem('wow_token', token);
      localStorage.setItem('wow_user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Ошибка авторизации' 
      };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/register', { username, password });
      const { token, user } = res.data;
      
      localStorage.setItem('wow_token', token);
      localStorage.setItem('wow_user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Ошибка регистрации' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('wow_token');
    localStorage.removeItem('wow_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
