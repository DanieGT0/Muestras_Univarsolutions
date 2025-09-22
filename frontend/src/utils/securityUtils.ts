import { UserRole } from '../types';

export class SecurityUtils {
  private static instance: SecurityUtils;
  private securityEvents: Array<{ type: string; timestamp: number; details: string }> = [];

  static getInstance(): SecurityUtils {
    if (!SecurityUtils.instance) {
      SecurityUtils.instance = new SecurityUtils();
    }
    return SecurityUtils.instance;
  }

  // Log security events
  logSecurityEvent(type: string, details: string) {
    const event = {
      type,
      timestamp: Date.now(),
      details
    };

    this.securityEvents.push(event);
    console.warn(`🔒 SECURITY EVENT [${type}]: ${details}`);

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }
  }

  // Validate token format
  isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      this.logSecurityEvent('INVALID_TOKEN_FORMAT', 'Token is null or not a string');
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      this.logSecurityEvent('INVALID_TOKEN_FORMAT', 'Token does not have 3 parts');
      return false;
    }

    try {
      // Try to decode header and payload
      JSON.parse(atob(parts[0]));
      JSON.parse(atob(parts[1]));
      return true;
    } catch (error) {
      this.logSecurityEvent('INVALID_TOKEN_FORMAT', 'Token parts cannot be decoded');
      return false;
    }
  }

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const isExpired = payload.exp < currentTime;

      if (isExpired) {
        this.logSecurityEvent('TOKEN_EXPIRED', `Token expired at ${new Date(payload.exp * 1000)}`);
      }

      return isExpired;
    } catch (error) {
      this.logSecurityEvent('TOKEN_VALIDATION_ERROR', 'Error checking token expiration');
      return true;
    }
  }

  // Validate user object
  isValidUser(user: any): boolean {
    if (!user || typeof user !== 'object') {
      this.logSecurityEvent('INVALID_USER', 'User is null or not an object');
      return false;
    }

    const requiredFields = ['id', 'email', 'role'];
    for (const field of requiredFields) {
      if (!user[field]) {
        this.logSecurityEvent('INVALID_USER', `Missing required field: ${field}`);
        return false;
      }
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(user.role)) {
      this.logSecurityEvent('INVALID_USER', `Invalid user role: ${user.role}`);
      return false;
    }

    return true;
  }

  // Clear all tokens and user data
  clearAuthData() {
    this.logSecurityEvent('AUTH_CLEAR', 'Clearing all authentication data');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth-storage');

    // Clear any potential auth cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }

  // Check for suspicious activity
  detectSuspiciousActivity(): boolean {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const suspiciousTypes = ['INVALID_TOKEN_FORMAT', 'TOKEN_EXPIRED', 'INVALID_USER'];
    const suspiciousCount = recentEvents.filter(
      event => suspiciousTypes.includes(event.type)
    ).length;

    if (suspiciousCount >= 3) {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', `${suspiciousCount} security events in 5 minutes`);
      return true;
    }

    return false;
  }

  // Get security events for audit
  getSecurityEvents() {
    return [...this.securityEvents];
  }

  // Validate session integrity
  validateSession(): { isValid: boolean; reason?: string } {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      return { isValid: false, reason: 'No token found' };
    }

    if (!this.isValidJWTFormat(token)) {
      return { isValid: false, reason: 'Invalid token format' };
    }

    if (this.isTokenExpired(token)) {
      return { isValid: false, reason: 'Token expired' };
    }

    // Check for suspicious activity
    if (this.detectSuspiciousActivity()) {
      this.clearAuthData();
      return { isValid: false, reason: 'Suspicious activity detected' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const securityUtils = SecurityUtils.getInstance();

// URL Access Blocker - Prevent direct URL access
export function blockDirectURLAccess() {
  // Block common development tools access
  const blockDevTools = () => {
    // Disable right-click in production
    if (import.meta.env.PROD) {
      document.addEventListener('contextmenu', (e) => e.preventDefault());

      // Detect DevTools
      let devtools = { open: false, orientation: null };

      setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
          if (!devtools.open) {
            devtools.open = true;
            securityUtils.logSecurityEvent('DEVTOOLS_OPENED', 'Developer tools detected');
          }
        } else {
          devtools.open = false;
        }
      }, 500);
    }
  };

  // Log page access attempts
  const logPageAccess = () => {
    securityUtils.logSecurityEvent('PAGE_ACCESS', `Accessing: ${window.location.pathname}`);
  };

  // Initialize blocking
  blockDevTools();
  logPageAccess();

  // Monitor for manual URL changes
  let lastPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      securityUtils.logSecurityEvent('URL_CHANGE', `Manual URL change to: ${lastPath}`);

      // Validate session on URL change
      const sessionCheck = securityUtils.validateSession();
      if (!sessionCheck.isValid) {
        securityUtils.logSecurityEvent('UNAUTHORIZED_ACCESS', `Access blocked: ${sessionCheck.reason}`);
        window.location.href = '/login';
      }
    }
  }, 1000);
}

// Initialize security on app load
if (typeof window !== 'undefined') {
  blockDirectURLAccess();
}