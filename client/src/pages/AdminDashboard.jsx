import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, MonitorPlay, Zap, Megaphone, LogIn, Eye, EyeOff, 
  BadgeCheck, Coins, Sparkles, Trash2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalMessages: 0, totalGroups: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [broadcastText, setBroadcastText] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);

  const [coinModalUser, setCoinModalUser] = useState(null);
  const [coinAmount, setCoinAmount] = useState('1000');

  const { logout, setUser, setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get(`/api/admin/users-full?page=${page}&limit=10&search=${search}&status=${statusFilter}`)
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalPages(usersRes.data.totalPages);
    } catch (error) {
      console.error('Ошибка загрузки данных', error);
      toast.error('Ошибка при обновлении данных');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [page, search, statusFilter]);

  const handleBlockUser = async (id) => {
    try {
      const res = await axios.put(`/api/admin/users/${id}/block`);
      toast.success(res.data.message || 'Статус пользователя изменен');
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка блокировки');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Вы уверены, что хотите полностью удалить этого пользователя и его чаты?')) return;
    try {
      const res = await axios.delete(`/api/admin/users/${id}`);
      toast.success(res.data.message || 'Пользователь удален');
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleToggleRole = async (id) => {
    try {
      const res = await axios.put(`/api/admin/users/${id}/role`);
      toast.success(res.data.message || 'Роль изменена');
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка изменения роли');
    }
  };

  const handleToggleVerify = async (id) => {
    try {
      const res = await axios.put(`/api/admin/users/${id}/verify`);
      toast.success(res.data.message || 'Статус верификации изменен');
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка изменения верификации');
    }
  };

  const handleGiveCoins = async (e) => {
    e.preventDefault();
    if (!coinModalUser || !coinAmount) return;
    const toastId = toast.loading('Изменение баланса монет...');
    try {
      const res = await axios.put(`/api/admin/users/${coinModalUser.id}/coins`, { amount: parseInt(coinAmount, 10) });
      toast.success(res.data.message || 'Монеты успешно зачислены!', { id: toastId });
      setCoinModalUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка изменения монет', { id: toastId });
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    
    const toastId = toast.loading('Отправка уведомления...');
    try {
      await axios.post('/api/admin/broadcast', { text: broadcastText });
      toast.success('Уведомление успешно отправлено всем пользователям!', { id: toastId });
      setBroadcastText('');
      setShowBroadcast(false);
    } catch (error) {
      toast.error('Ошибка при отправке уведомления', { id: toastId });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLoginAs = async (userId, username) => {
    if (!window.confirm(`Войти как пользователь "${username}"? Вы будете перенаправлены в чат.`)) return;
    try {
      const res = await axios.post(`/api/admin/login-as/${userId}`);
      const { token, user } = res.data;
      localStorage.setItem('wow_token', token);
      localStorage.setItem('wow_user', JSON.stringify(user));
      if (setToken) setToken(token);
      if (setUser) setUser(user);
      toast.success(`Вы успешно вошли как ${username}`);
      navigate('/');
      window.location.reload();
    } catch (error) {
      toast.error('Ошибка входа');
    }
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top left, #1e1b4b, #0f172a, #020617)', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Ultra-Modern Glass Sidebar */}
      <aside className="sidebar" style={{ width: '260px', padding: '24px 20px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div className="sidebar-logo" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '32px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '10px', textShadow: '0 0 12px rgba(129, 140, 248, 0.4)' }}>
          <Sparkles size={24} color="#818cf8" />
          <span>WoW Admin Pro</span>
        </div>

        <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <a href="#" className="active" style={{ textDecoration: 'none', color: '#818cf8', background: 'rgba(129, 140, 248, 0.12)', padding: '12px 16px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
              <Users size={18} /> Пользователи
            </a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ textDecoration: 'none', color: '#94a3b8', padding: '12px 16px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
              <ArrowLeft size={18} /> Чат Мессенджера
            </a>
          </li>
        </ul>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn" onClick={fetchData} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
            <RefreshCw size={16} /> Обновить данные
          </button>
          <button className="btn" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Панель Управления Админа 👑</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0' }}>Полный доступ к пользователям, экономике и глобальным оповещениям</p>
          </div>
          <button className="btn" onClick={() => setShowBroadcast(true)} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
            <Megaphone size={18} /> Глобальное уведомление
          </button>
        </div>

        {/* Stats Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '18px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}><Users size={16} color="#818cf8" /> Всего юзеров</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc' }}>{stats.totalUsers}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '18px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}><MonitorPlay size={16} color="#34d399" /> Онлайн в сети</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34d399' }}>{stats.onlineUsers}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '18px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}><MessageSquare size={16} color="#fbbf24" /> Всего сообщений</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc' }}>{stats.totalMessages}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '18px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}><Zap size={16} color="#f472b6" /> Групп и каналов</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc' }}>{stats.totalGroups}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Поиск по имени пользователя..." 
            style={{ flex: 1, minWidth: '240px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '12px 16px', borderRadius: '14px', outline: 'none' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '12px 16px', borderRadius: '14px', outline: 'none' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </div>

        {/* Users Table Container */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Загрузка данных пользователей...
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '16px 20px' }}>Пользователь</th>
                      <th style={{ padding: '16px 20px' }}>Роль</th>
                      <th style={{ padding: '16px 20px' }}>Статус</th>
                      <th style={{ padding: '16px 20px' }}>Управление</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc' }}>
                            {u.username}
                            {u.username === 'MilkyVIP' && <BadgeCheck size={18} color="#3b82f6" title="Главный Админ" />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Зарегистрирован: {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: u.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: u.role === 'admin' ? '#c084fc' : '#94a3b8', border: u.role === 'admin' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                            {u.role === 'admin' ? 'ADMIN' : 'USER'}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          {u.isBlocked ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                              ЗАБЛОКИРОВАН
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: u.status === 'online' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(148, 163, 184, 0.1)', color: u.status === 'online' ? '#34d399' : '#94a3b8', border: u.status === 'online' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)' }}>
                              {u.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => setCoinModalUser(u)}
                              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Выдать монеты"
                            >
                              <Coins size={14} /> 🪙 Монеты
                            </button>

                            {u.username !== 'MilkyVIP' && (
                              <button 
                                onClick={() => handleBlockUser(u.id)}
                                style={{ background: u.isBlocked ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: u.isBlocked ? '#34d399' : '#fbbf24', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                              >
                                {u.isBlocked ? 'Разблок.' : 'Заблок.'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          Пользователи по вашему запросу не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '8px 16px', borderRadius: '10px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                    Назад
                  </button>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>Страница {page} из {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '8px 16px', borderRadius: '10px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                    Вперед
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Give Coins Modal */}
      {coinModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', borderRadius: '24px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Coins size={28} color="#fbbf24" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>Управление Монетами</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              Изменение баланса для пользователя <b style={{ color: '#f8fafc' }}>@{coinModalUser.username}</b>
            </p>
            <form onSubmit={handleGiveCoins}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                  Количество монет (+ или -):
                </label>
                <input 
                  type="number" 
                  style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', padding: '12px 16px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 800, outline: 'none' }} 
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setCoinModalUser(null)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  Отмена
                </button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}>
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Megaphone size={28} color="#a855f7" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>Глобальное Уведомление</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>Сообщение мгновенно поступит всем зарегистрированным пользователям.</p>
            <form onSubmit={handleBroadcast}>
              <textarea 
                rows="4" 
                placeholder="Введи текст важного объявления..." 
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                required
                style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '20px', resize: 'none', outline: 'none', fontSize: '0.95rem' }}
              ></textarea>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowBroadcast(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  Отмена
                </button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}>
                  Отправить ВСЕМ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
