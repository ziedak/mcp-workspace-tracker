import { UserImpl } from '../src/models/User';
import { UserRole } from '../src/models/interfaces';

describe('User', () => {
  it('should create a user with correct properties', () => {
    const user = new UserImpl(1, 'Test User', 'test@example.com', UserRole.ADMIN);
    
    expect(user.id).toBe(1);
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe(UserRole.ADMIN);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should identify admin users correctly', () => {
    const admin = new UserImpl(1, 'Admin', 'admin@example.com', UserRole.ADMIN);
    const editor = new UserImpl(2, 'Editor', 'editor@example.com', UserRole.EDITOR);
    
    expect(admin.isAdmin()).toBe(true);
    expect(editor.isAdmin()).toBe(false);
  });

  it('should track last login time', () => {
    const user = new UserImpl(1, 'Test User', 'test@example.com');
    
    expect(user.getLastLoginTime()).toBe('Never logged in');
    
    user.updateLastLogin();
    expect(user.getLastLoginTime()).toMatch(/minutes ago/);
  });
});
