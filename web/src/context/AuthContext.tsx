import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  role: string;
  currency?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeBusiness: BusinessItem | null;
  businesses: BusinessItem[];
  isLoading: boolean;
  login: (token: string, user: User, activeBusiness: BusinessItem, businesses: BusinessItem[]) => void;
  logout: () => void;
  switchBusiness: (businessId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('torque_token'));
  const [activeBusiness, setActiveBusiness] = useState<BusinessItem | null>(() => {
    const saved = localStorage.getItem('torque_business_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!localStorage.getItem('torque_token')) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: User; activeBusiness: BusinessItem; businesses: BusinessItem[] }>('/auth/me');
      setUser(data.user);
      setBusinesses(data.businesses || []);
      
      const currentActiveId = localStorage.getItem('torque_business_id');
      const found = data.businesses.find(b => b.id === currentActiveId) || data.activeBusiness || data.businesses[0];
      if (found) {
        setActiveBusiness(found);
        localStorage.setItem('torque_business_id', found.id);
        localStorage.setItem('torque_business_data', JSON.stringify(found));
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (
    newToken: string,
    newUser: User,
    newActiveBusiness: BusinessItem,
    newBusinesses: BusinessItem[]
  ) => {
    localStorage.setItem('torque_token', newToken);
    if (newActiveBusiness) {
      localStorage.setItem('torque_business_id', newActiveBusiness.id);
      localStorage.setItem('torque_business_data', JSON.stringify(newActiveBusiness));
    }
    setToken(newToken);
    setUser(newUser);
    setActiveBusiness(newActiveBusiness);
    setBusinesses(newBusinesses || []);
  };

  const logout = () => {
    // Invalidate the session server-side (best-effort) before clearing local state.
    if (localStorage.getItem('torque_token')) {
      apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    localStorage.removeItem('torque_token');
    localStorage.removeItem('torque_business_id');
    localStorage.removeItem('torque_business_data');
    setToken(null);
    setUser(null);
    setActiveBusiness(null);
    setBusinesses([]);
  };

  const switchBusiness = (businessId: string) => {
    const target = businesses.find((b) => b.id === businessId);
    if (target) {
      setActiveBusiness(target);
      localStorage.setItem('torque_business_id', target.id);
      localStorage.setItem('torque_business_data', JSON.stringify(target));
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeBusiness,
        businesses,
        isLoading,
        login,
        logout,
        switchBusiness,
        refreshUser,
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
