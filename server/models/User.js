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
  coins: {
    type: Number,
    default: 100, // Каждый пользователь получает 100 стартовых монет
  },
  avatarFrame: {
    type: String,
    default: 'none',
  },
  nameColor: {
    type: String,
    default: 'default',
  },
  badges: {
    type: [String],
    default: ['Участник'],
  },
  inventory: {
    type: [String],
    default: ['frame_none', 'color_default'],
  },
  activeTheme: {
    type: String,
    default: 'default',
  },
  userTitle: {
    type: String,
    default: '',
  },
  profileAura: {
    type: String,
    default: 'none',
  },
  chatStyle: {
    type: String,
    default: 'default',
  },
  giftsReceived: [{
    fromUserId: String,
    fromUsername: String,
    giftType: String,
    giftName: String,
    giftIcon: String,
    coins: Number,
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  lastDailyClaim: {
    type: Date,
  },
  dailyStreak: {
    type: Number,
    default: 0,
  },
  lastSpinTime: {
    type: Date,
  },
  completedQuests: [{
    type: String,
  }],
  clickerLevel: {
    type: Number,
    default: 1,
  },
  clickerStats: {
    energy: { type: Number, default: 1000 },
    maxEnergy: { type: Number, default: 1000 },
    energyLevel: { type: Number, default: 1 },
    multitapLevel: { type: Number, default: 1 },
    rechargeLevel: { type: Number, default: 1 },
    lastEnergyUpdate: { type: Date, default: Date.now }
  },
  businesses: {
    channelLevel: { type: Number, default: 0 },
    agencyLevel: { type: Number, default: 0 },
    fundLevel: { type: Number, default: 0 },
    botLevel: { type: Number, default: 0 },
    lastCollected: { type: Date, default: Date.now }
  },
  nfts: [{ type: String }],
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
