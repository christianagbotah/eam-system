/**
 * Enterprise-Grade Token Management System
 * Handles automatic token refresh, expiration, and session persistence
 */

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_expires_at: number;
}

class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Store tokens with expiration tracking (synchronous)
   */
  setTokens(accessToken: string, refreshToken?: string, expiresIn: number = 3600): void {
    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000);
    
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('token_expires_at', expiresAt.toString());
    
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new Event('storage'));
    
    // Schedule refresh 5 minutes before expiration
    this.scheduleTokenRefresh(expiresIn);
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getAccessToken(): Promise<string | null> {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token) return null;
    
    // Check if token is expired or will expire in next 5 minutes
    if (expiresAt) {
      const now = Date.now();
      const expirationTime = parseInt(expiresAt);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now >= expirationTime - fiveMinutes) {
        // Token expired or expiring soon - refresh it
        return await this.refreshAccessToken();
      }
    }
    
    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      this.clearTokens();
      throw new Error('NO_REFRESH_TOKEN');
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1/eam'}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );

      if (!response.ok) {
        throw new Error('REFRESH_FAILED');
      }

      const data = await response.json();
      const newAccessToken = data.token || data.access_token || data.data?.token;
      const newRefreshToken = data.refresh_token || data.data?.refresh_token;
      const expiresIn = data.expires_in || data.data?.expires_in || 3600;

      if (!newAccessToken) {
        throw new Error('INVALID_REFRESH_RESPONSE');
      }

      this.setTokens(newAccessToken, newRefreshToken || refreshToken, expiresIn);
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh 5 minutes before expiration
    const refreshTime = (expiresIn - 300) * 1000; // 5 minutes before expiry
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
        }
      }, refreshTime);
    }
  }

  /**
   * Clear all tokens and timers
   */
  clearTokens(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user');
    localStorage.removeItem('login_time');
    localStorage.removeItem('last_activity');
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Set access token only
   */
  setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token || !expiresAt) return false;
    
    const now = Date.now();
    const expirationTime = parseInt(expiresAt);
    
    return now < expirationTime;
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
