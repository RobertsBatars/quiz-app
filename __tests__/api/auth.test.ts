import { NextRequest } from 'next/server';
import { POST } from '../../app/api/auth/[...nextauth]/route';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle login with correct credentials', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'password123'
    };

    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      password: 'hashedPassword123',
      loginAttempts: 0,
      toObject: () => ({
        _id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        status: 'active',
        settings: {
          emailNotifications: true,
          twoFactorEnabled: false,
          theme: 'system'
        }
      })
    };

    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);
    jest.spyOn(User, 'updateOne').mockResolvedValueOnce({ modifiedCount: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        csrfToken: 'mock-csrf-token',
        ...requestBody,
        json: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        url: expect.stringContaining('/dashboard')
      })
    );
  });

  it('should handle login with incorrect password', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      password: 'hashedPassword123',
      loginAttempts: 0,
      save: jest.fn()
    };

    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

    const request = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        csrfToken: 'mock-csrf-token',
        ...requestBody,
        json: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        error: 'Invalid credentials'
      })
    );
  });

  it('should handle login with banned user', async () => {
    const requestBody = {
      email: 'banned@example.com',
      password: 'password123'
    };

    const mockUser = {
      _id: '123',
      email: 'banned@example.com',
      name: 'Banned User',
      role: 'user',
      status: 'banned',
      password: 'hashedPassword123',
      loginAttempts: 0,
      save: jest.fn()
    };

    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

    const request = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        csrfToken: 'mock-csrf-token',
        ...requestBody,
        json: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        error: 'Account is banned'
      })
    );
  });

  it('should handle login with locked account', async () => {
    const requestBody = {
      email: 'locked@example.com',
      password: 'password123'
    };

    const mockUser = {
      _id: '123',
      email: 'locked@example.com',
      name: 'Locked User',
      role: 'user',
      status: 'active',
      password: 'hashedPassword123',
      loginAttempts: 5,
      lockUntil: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
      save: jest.fn()
    };

    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

    const request = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        csrfToken: 'mock-csrf-token',
        ...requestBody,
        json: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual(
      expect.objectContaining({
        error: 'Account is temporarily locked. Try again later.'
      })
    );
  });
});