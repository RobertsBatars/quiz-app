import { User } from '../../models/User';
import mongoose from 'mongoose';

describe('User Model Test', () => {
  it('should create & save user successfully', async () => {
    const validUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'securePassword123',
      role: 'user',
      status: 'active',
      settings: {
        emailNotifications: true,
        twoFactorEnabled: false,
        theme: 'light'
      }
    };

    const user = new User(validUser);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(validUser.email);
    expect(savedUser.password).not.toBe(validUser.password); // Should be hashed
    expect(savedUser.role).toBe(validUser.role);
  });

  it('should fail to save user without required fields', async () => {
    const userWithoutRequiredField = new User({ name: 'Test User' });
    let err;
    
    try {
      await userWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should fail to save user with invalid role', async () => {
    const userWithInvalidRole = new User({
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
      role: 'invalid_role',
      status: 'active'
    });

    let err;
    try {
      await userWithInvalidRole.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });
});