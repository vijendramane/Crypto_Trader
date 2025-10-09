const request = require('supertest');
const app = require('../src/server');
const { User } = require('../src/models');
const JWTUtil = require('../src/utils/jwt');

// Test database setup
beforeAll(async () => {
  // Use test database
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'primetrade_test';
  
  // Sync database
  await require('../src/models').syncDatabase({ force: true });
});

afterAll(async () => {
  // Clean up
  await require('../src/config/database').sequelize.close();
});

beforeEach(async () => {
  // Clean up database before each test
  await User.destroy({ where: {}, force: true });
});

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Should be excluded
    });

    test('should fail with weak password', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with mismatched passwords', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Different123!@#'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#'
      };

      // Create first user
      await User.createUser(userData);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should fail with invalid password', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'WrongPassword123!@#'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should lock account after multiple failed attempts', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'WrongPassword'
      };

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);
      }

      // 6th attempt should return locked account error
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const user = await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });

      const tokens = JWTUtil.generateTokenPair(user);
      refreshToken = tokens.refreshToken;
    });

    test('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    test('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    test('should fail without refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let user;
    let accessToken;

    beforeEach(async () => {
      user = await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });

      const tokens = JWTUtil.generateTokenPair(user);
      accessToken = tokens.accessToken;
    });

    test('should get profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.firstName).toBe(user.firstName);
      expect(response.body.data.user.lastName).toBe(user.lastName);
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let user;
    let accessToken;

    beforeEach(async () => {
      user = await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });

      const tokens = JWTUtil.generateTokenPair(user);
      accessToken = tokens.accessToken;
    });

    test('should update profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        profile: {
          bio: 'Crypto trader',
          experience: '5 years'
        }
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe(updateData.lastName);
      expect(response.body.data.user.profile.bio).toBe(updateData.profile.bio);
      expect(response.body.data.user.profile.experience).toBe(updateData.profile.experience);
    });

    test('should fail with invalid first name', async () => {
      const updateData = {
        firstName: 'J' // Too short
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/password/reset-request', () => {
    beforeEach(async () => {
      await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });
    });

    test('should handle password reset request', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'john.doe@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    test('should not reveal non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      const user = await User.createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Test123!@#'
      });

      const tokens = JWTUtil.generateTokenPair(user);
      accessToken = tokens.accessToken;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    test('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});

describe('JWT Utility Functions', () => {
  describe('Token Generation', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'user',
      isEmailVerified: true
    };

    test('should generate valid token pair', () => {
      const tokens = JWTUtil.generateTokenPair(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should verify access token successfully', () => {
      const tokens = JWTUtil.generateTokenPair(mockUser);
      const decoded = JWTUtil.verifyAccessToken(tokens.accessToken);

      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.isEmailVerified).toBe(mockUser.isEmailVerified);
    });

    test('should verify refresh token successfully', () => {
      const tokens = JWTUtil.generateTokenPair(mockUser);
      const decoded = JWTUtil.verifyRefreshToken(tokens.refreshToken);

      expect(decoded.id).toBe(mockUser.id);
    });

    test('should extract token from Authorization header', () => {
      const token = 'sample.jwt.token';
      const authHeader = `Bearer ${token}`;

      const extractedToken = JWTUtil.extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
    });

    test('should return null for invalid Authorization header', () => {
      const extractedToken = JWTUtil.extractTokenFromHeader('Invalid header');
      expect(extractedToken).toBeNull();
    });
  });

  describe('Token Validation', () => {
    test('should throw error for invalid token', () => {
      expect(() => {
        JWTUtil.verifyAccessToken('invalid.token.format');
      }).toThrow('Invalid token');
    });

    test('should throw error for expired token', () => {
      // Create token with very short expiration
      const shortLivedToken = require('jsonwebtoken').sign(
        { id: '123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          JWTUtil.verifyAccessToken(shortLivedToken);
        }).toThrow('Token expired');
      }, 10);
    });
  });
});