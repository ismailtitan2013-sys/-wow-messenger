const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  // Этот middleware должен использоваться после authMiddleware,
  // чтобы req.user уже был установлен.
  if (!req.user) {
    return res.status(401).json({ message: 'Нет доступа' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'admin' && user.username !== 'MilkyVIP')) {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Ошибка проверки прав' });
  }
};

module.exports = adminMiddleware;
