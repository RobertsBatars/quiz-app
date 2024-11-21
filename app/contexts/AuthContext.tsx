'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  projectCount: number;
  uploadLimit: number;
}

interface Project {
  id: string;
  name: string;
  userId: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  createProject: (name: string) => Promise<void>;
  getProjects: () => Project[];
  projects: Project[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login logic
    console.log('Login attempt:', email, password);
    const mockUser = { id: '1', email, name: 'John Doe', projectCount: 0, uploadLimit: 100 };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const register = async (email: string, password: string, name: string) => {
    // Mock registration logic
    console.log('Registration attempt:', email, password, name);
    const mockUser = { id: '1', email, name, projectCount: 0, uploadLimit: 100 };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const createProject = async (name: string) => {
    if (user) {
      const newProject: Project = { id: Date.now().toString(), name, userId: user.id };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      const updatedUser = { ...user, projectCount: user.projectCount + 1 };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const getProjects = () => {
    return projects.filter(project => user && project.userId === user.id);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, createProject, getProjects, projects }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

