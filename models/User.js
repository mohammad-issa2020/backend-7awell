const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database/connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^\+[1-9]\d{1,14}$/ // E.164 format
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Can be null for OTP-only authentication
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'moderator'),
    defaultValue: 'user'
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailOtp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phoneOtp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailOtpExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phoneOtpExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  underscored: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password') && user.password) {
        const saltRounds = 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.generateOtp = function() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

User.prototype.setEmailOtp = function() {
  this.emailOtp = this.generateOtp();
  this.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

User.prototype.setPhoneOtp = function() {
  this.phoneOtp = this.generateOtp();
  this.phoneOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

User.prototype.isEmailOtpValid = function(otp) {
  return this.emailOtp === otp && new Date() < this.emailOtpExpiry;
};

User.prototype.isPhoneOtpValid = function(otp) {
  return this.phoneOtp === otp && new Date() < this.phoneOtpExpiry;
};

User.prototype.clearEmailOtp = function() {
  this.emailOtp = null;
  this.emailOtpExpiry = null;
};

User.prototype.clearPhoneOtp = function() {
  this.phoneOtp = null;
  this.phoneOtpExpiry = null;
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.emailOtp;
  delete values.phoneOtp;
  delete values.refreshToken;
  return values;
};

module.exports = User; 