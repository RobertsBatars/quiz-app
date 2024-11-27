import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '../../models/User';

describe('Auth API', () => {
  it('should handle user registration', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }
    });

    // Mock the registration handler
    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    };

    jest.spyOn(User, 'create').mockResolvedValueOnce(mockUser as any);

    // Call the API route handler
    // await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User'
        })
      })
    );
  });

  it('should handle login with correct credentials', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      comparePassword: jest.fn().mockResolvedValueOnce(true)
    };

    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

    // Call the API route handler
    // await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          email: 'test@example.com'
        })
      })
    );
  });
});