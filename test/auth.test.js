require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');

// 🧪 Mock sendEmail to avoid actual sending
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth Routes', () => {
  const userData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123',
  };

  test('Register - success', async () => {
    const res = await request(app).post('/api/auth/register').send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/verify your email/i);
  });

  test('Verify Email - success', async () => {
    const user = await User.create({ ...userData, verified: false });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`/api/auth/verify-email?token=${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/email verified/i);
  });

  test('Login - success', async () => {
    await User.create({ ...userData, verified: true });

    const res = await request(app).post('/api/auth/login').send({
      email: userData.email,
      password: userData.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('Forgot Password - success', async () => {
    await User.create({ ...userData, verified: true });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userData.email });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/password reset/i);
  });

test('Reset Password - success', async () => {
  const user = await User.create({ ...userData, verified: true });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({
      token,
      password: 'newpassword123',
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/password reset successful/i); // lowercase "s"
});

 test('Logout - success', async () => {
  await User.create({ ...userData, verified: true });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: userData.email,
    password: userData.password,
  });

  const token = loginRes.body.token;

  const res = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/logged out/i);
});

});
