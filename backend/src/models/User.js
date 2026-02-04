const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
 
class User extends Model {
  // Instance method to check password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password); 
  }
 
  // Instance method to convert user to JSON (exclude sensitive data)
  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.deletedAt;
    return values;
  }

  // Static method to find user by email
  static async findByEmail(email) {
    return await this.findOne({
      where: { email: email.toLowerCase() }
    });
  }

  // Static method to create user with hashed password
  static async createUser(userData) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    return await this.create({
      ...userData,
      email: userData.email.toLowerCase(),
      password: hashedPassword
    });
  }

  // Instance method to update password
  async updatePassword(newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await this.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });
  }

  // Instance method to generate password reset token
  generatePasswordResetToken() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
  }

  // Static method to find user by reset token
  static async findByResetToken(token) {
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return await this.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [sequelize.Sequelize.Op.gt]: Date.now() }
      }
    });
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'First name is required'
      },
      len: {
        args: [2, 50],
        msg: 'First name must be between 2 and 50 characters'
      }
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Last name is required'
      },
      len: {
        args: [2, 50],
        msg: 'Last name must be between 2 and 50 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      name: 'unique_email',
      msg: 'Email address already exists'
    },
    validate: {
      isEmail: {
        msg: 'Please provide a valid email address'
      },
      notEmpty: {
        msg: 'Email is required'
      }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Password is required'
      },
      len: {
        args: [8, 255],
        msg: 'Password must be at least 8 characters long'
      },
      is: {
        args: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        msg: 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
    validate: {
      isIn: {
        args: [['user', 'admin']],
        msg: 'Role must be either user or admin'
      }
    }
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING
  },
  passwordResetToken: {
    type: DataTypes.STRING
  },
  passwordResetExpires: {
    type: DataTypes.DATE
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING
  },
  profile: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  paranoid: true, // Enables soft deletes
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['isEmailVerified']
    },
    {
      fields: ['passwordResetToken']
    }
  ],
  hooks: {
    beforeValidate: (user) => {
      if (user.email) {
        user.email = user.email.toLowerCase();
      }
    }
  }
});

module.exports = User;
