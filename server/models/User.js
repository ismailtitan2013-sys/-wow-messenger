const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },
  plainPassword: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  pushSubscriptions: [{
    endpoint: String,
    expirationTime: Date,
    keys: {
      p256dh: String,
      auth: String
    }
  }],
  fcmTokens: [{ type: String }],
  settings: {
    showOnlineStatus: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
    allowPushNotifications: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true },
    accentColor: { type: String, default: '#4f46e5' }
  }
}, { timestamps: true });

// Переопределение метода toJSON для скрытия пароля при отправке данных на клиент
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.password;
    delete returnedObject.plainPassword;
  }
});

module.exports = mongoose.model('User', userSchema);
