import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { acl, type User } from '@/lib/acl';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user from localStorage or token
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        acl.setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    acl.setUser(userData);
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    acl.setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const can = (permission: string): boolean => {
    return acl.can(permission);
  };

  const cannot = (permission: string): boolean => {
    return acl.cannot(permission);
  };

  const hasRole = (role: string): boolean => {
    return acl.hasRole(role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return acl.hasAnyRole(roles);
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    can,
    cannot,
    hasRole,
    hasAnyRole
  };
};
