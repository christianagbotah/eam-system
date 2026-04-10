export const checkAuth = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    // Clear any stale data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return null;
  }
  try {
    const parsedUser = JSON.parse(user);
    return { token, user: parsedUser };
  } catch (error) {
    // Invalid user data, clear and return null
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const requireAuth = (allowedRoles?: string[]) => {
  const auth = checkAuth();
  if (!auth) {
    window.location.href = '/login';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
    window.location.href = '/unauthorized';
    return null;
  }
  return auth;
};
