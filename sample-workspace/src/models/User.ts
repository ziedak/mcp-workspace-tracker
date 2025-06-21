import { User, UserRole } from './interfaces';

/**
 * User class implementation
 */
export class UserImpl implements User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  private lastLogin: Date | null = null;

  /**
   * Create a new user
   */
  constructor(id: number, name: string, email: string, role: UserRole = UserRole.VIEWER) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.createdAt = new Date();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Update last login time
   */
  updateLastLogin(): void {
    this.lastLogin = new Date();
  }

  /**
   * Get time since last login
   */
  getLastLoginTime(): string {
    if (!this.lastLogin) {
      return 'Never logged in';
    }
    
    const diff = new Date().getTime() - this.lastLogin.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hours ago`;
    }
  }
}
