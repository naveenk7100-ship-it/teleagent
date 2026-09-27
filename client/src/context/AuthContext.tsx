import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken } from '../api/client';
import type { AuthUserDTO, Tenant, UserRole } from '../types';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUserDTO | null;
  role: UserRole | null;
  workspace: Tenant | null;
  workspaces: Tenant[];
  activeWorkspaceId: string | null;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; name?: string; businessName?: string; industry?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: { name: string; businessName?: string; industry?: string; description?: string }) => Promise<Tenant>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUserDTO | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [workspace, setWorkspace] = useState<Tenant | null>(null);
  const [workspaces, setWorkspaces] = useState<Tenant[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setWorkspace(null);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.getMe();
      setUser(data.user);
      setRole(data.role);
      setWorkspace(data.workspace);
      setWorkspaces(data.workspaces || []);
      setActiveWorkspaceId(data.activeWorkspaceId);
      setIsAuthenticated(true);
      setError(null);
    } catch (err: any) {
      console.warn('Session verification failed, logging out:', err.message);
      await api.logout();
      setIsAuthenticated(false);
      setUser(null);
      setWorkspace(null);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(credentials);
      setUser(res.user);
      setWorkspace(res.workspace);
      setWorkspaces(res.workspaces);
      setActiveWorkspaceId(res.activeWorkspaceId);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { email: string; password: string; name?: string; businessName?: string; industry?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.signup(data);
      setUser(res.user);
      setWorkspace(res.workspace);
      setWorkspaces(res.workspaces);
      setActiveWorkspaceId(res.activeWorkspaceId);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.logout();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setRole(null);
      setWorkspace(null);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setIsLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    try {
      setIsLoading(true);
      const res = await api.switchWorkspace(workspaceId);
      setWorkspace(res.workspace);
      setWorkspaces(res.workspaces);
      setActiveWorkspaceId(res.activeWorkspaceId);
    } catch (err: any) {
      setError(err.message || 'Failed to switch workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkspace = async (data: { name: string; businessName?: string; industry?: string; description?: string }) => {
    try {
      setIsLoading(true);
      const res = await api.createWorkspace(data);
      setWorkspace(res.workspace);
      setWorkspaces(res.workspaces);
      setActiveWorkspaceId(res.activeWorkspaceId);
      return res.workspace;
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        role,
        workspace,
        workspaces,
        activeWorkspaceId,
        error,
        login,
        signup,
        logout,
        switchWorkspace,
        createWorkspace,
        refreshAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
