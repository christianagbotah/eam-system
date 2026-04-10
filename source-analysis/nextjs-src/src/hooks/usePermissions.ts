import { useState, useEffect } from 'react';

interface User {
  id: string;
  role: string;
  permissions?: string[];
}

export function usePermissions() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Try to fetch permissions from API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = localStorage.getItem('access_token');
      
      if (apiUrl && token) {
        try {
          // Try multiple possible endpoints
          const userId = parsedUser.id;
          const endpoints = [
            `${apiUrl}/rbac/users/${userId}/permissions`,
            `${apiUrl}/users/${userId}/permissions`,
            `${apiUrl}/user/permissions`
          ];

          for (const endpoint of endpoints) {
            try {
              const response = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data?.permissions) {
                  setPermissions(data.data.permissions);
                  localStorage.setItem('user_permissions', JSON.stringify(data.data.permissions));
                  setLoading(false);
                  return;
                } else if (data.data && Array.isArray(data.data)) {
                  // Handle direct array response
                  setPermissions(data.data);
                  localStorage.setItem('user_permissions', JSON.stringify(data.data));
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (apiError) {
          console.warn('Failed to fetch permissions from API, using cached:', apiError);
        }
      }
      
      // Fallback to cached permissions or user object
      const cachedPermissions = localStorage.getItem('user_permissions');
      if (cachedPermissions) {
        setPermissions(JSON.parse(cachedPermissions));
      } else if (parsedUser.permissions) {
        setPermissions(parsedUser.permissions);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin' || user.role === 'administrator') return true;
    
    // Check exact permission
    if (permissions.includes(permission)) return true;
    
    // Fallback logic: Check related permissions
    const [module, action] = permission.split('.');
    
    // If checking module.view, check if user has any permission in that module
    if (action === 'view') {
      // Check if user has any permission starting with this module
      const hasModulePermission = permissions.some(p => p.startsWith(`${module}.`));
      if (hasModulePermission) return true;
      
      // Check common related permissions
      const relatedPermissions = [
        `${module}.create`,
        `${module}.edit`,
        `${module}.delete`,
        `${module}s.view`, // plural form
        `${module}_view`, // underscore form
      ];
      
      return relatedPermissions.some(p => permissions.includes(p));
    }
    
    return false;
  };

  const refreshPermissions = async () => {
    setLoading(true);
    await loadUserPermissions();
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    user,
    userRole: user?.role || '',
    userPermissions: permissions,
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    refreshPermissions
  };
}
