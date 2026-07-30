import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, MonitorPlay, Zap, Megaphone, LogIn, Eye, EyeOff, BadgeCheck } from 'lucide-react';
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

  const { logout, setUser, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPasswords, setShowPasswords] = useState(false);

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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Обновлять статусы раз в минуту
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
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
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
      // Обновляем контекст
      if (setToken) setToken(token);
      if (setUser) setUser(user);
      toast.success(`Вы вошли как ${username}`);
      navigate('/');
      window.location.reload();
    } catch (error) {
      toast.error('Ошибка входа');
    }
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: '250px', padding: '20px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-logo" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '30px', color: 'var(--primary-color)' }}>
          ✨ WoW Admin
        </div>
        <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '15px' }}>
            <a href="#" className="active" style={{ textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} /> Пользователи
            </a>
          </li>
          <li style={{ marginBottom: '15px' }}>
            <a href="#" onClick={() => navigate('/')} style={{ textDecoration: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={18} /> Вернуться в Чат
            </a>
          </li>
        </ul>
        <div style={{ marginTop: 'auto' }}>
          <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%' }}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>Панель управления</h2>
          <button className="btn btn-primary" onClick={() => setShowBroadcast(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={16} /> Глобальное уведомление
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16}/> Всего пользователей</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalUsers}</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><MonitorPlay size={16}/> Онлайн</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.onlineUsers}</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={16}/> Сообщений</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalMessages}</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={16}/> Групп</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalGroups}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Поиск по имени..." 
            className="form-control" 
            style={{ maxWidth: '300px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="form-control" 
            style={{ maxWidth: '200px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
          <button 
            className={`btn-sm ${showPasswords ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowPasswords(!showPasswords)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? 'Скрыть пароли' : 'Показать пароли'}
          </button>
        </div>

        {/* Users Table */}
        <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div className="skeleton skeleton-text short" style={{ height: '24px', flex: 1 }}></div>
                  <div className="skeleton skeleton-text" style={{ height: '24px', flex: 1 }}></div>
                  <div className="skeleton skeleton-text" style={{ height: '24px', flex: 1 }}></div>
                  <div className="skeleton skeleton-text" style={{ height: '24px', flex: 1 }}></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Имя</th>
                    {showPasswords && <th style={{ padding: '15px', textAlign: 'left' }}>Пароль</th>}
                    <th style={{ padding: '15px', textAlign: 'left' }}>Роль</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Статус</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {u.username}
                          {u.username === 'MilkyVIP' && <BadgeCheck size={16} color="#3b82f6" title="Оригинал" />}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      {showPasswords && (
                        <td style={{ padding: '15px' }}>
                          <code style={{ 
                            background: 'rgba(79, 70, 229, 0.1)', 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.85rem',
                            color: 'var(--primary-color)',
                            fontFamily: 'monospace',
                            userSelect: 'all'
                          }}>
                            {u.plainPassword || 'не сохранен'}
                          </code>
                        </td>
                      )}
                      <td style={{ padding: '15px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                          {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        {u.isBlocked ? (
                          <span className="badge badge-danger">Заблокирован</span>
                        ) : (
                          <span className={`badge ${u.status === 'online' ? 'badge-success' : 'badge-secondary'}`}>
                            {u.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-sm btn-outline" 
                            onClick={() => handleLoginAs(u.id, u.username)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Войти как этот пользователь"
                          >
                            <LogIn size={14} /> Войти
                          </button>
                          {u.username !== 'MilkyVIP' && (
                            <>
                              <button 
                                className={`btn-sm ${u.role === 'admin' ? 'btn-danger' : 'btn-primary'}`} 
                                onClick={() => handleToggleRole(u.id)}
                              >
                                {u.role === 'admin' ? 'Забрать админку' : 'Дать админку'}
                              </button>
                              <button 
                                className="btn-sm btn-outline" 
                                onClick={() => handleBlockUser(u.id)}
                              >
                                {u.isBlocked ? 'Разблок.' : 'Блок.'}
                              </button>
                              <button 
                                className="btn-sm btn-danger"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                Удалить
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={showPasswords ? "5" : "4"} style={{ textAlign: 'center', padding: '2rem' }}>
                        Пользователи не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '15px', borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Назад</button>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{page} из {totalPages}</span>
                  <button className="btn-sm btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Вперед</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-secondary)', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
            <h3>Глобальное уведомление</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Это сообщение придет всем пользователям.</p>
            <form onSubmit={handleBroadcast}>
              <textarea 
                className="form-control" 
                rows="4" 
                placeholder="Текст уведомления..." 
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                required
                style={{ width: '100%', marginBottom: '20px', resize: 'none' }}
              ></textarea>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBroadcast(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Отправить всем</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
