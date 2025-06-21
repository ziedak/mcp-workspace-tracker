import { User, UserRole, DataService } from '../models/interfaces';
import { UserImpl } from '../models/User';
import { validateEmail } from '../utils/helpers';

/**
 * User service implementation
 */
export class UserService implements DataService<User> {
  private users: User[] = [];
  
  constructor() {
    // Add some sample users
    this.users = [
      new UserImpl(1, 'Admin User', 'admin@example.com', UserRole.ADMIN),
      new UserImpl(2, 'Editor User', 'editor@example.com', UserRole.EDITOR),
      new UserImpl(3, 'Viewer User', 'viewer@example.com', UserRole.VIEWER)
    ];
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.users;
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  /**
   * Create a new user
   */
  async create(item: Omit<User, 'id'>): Promise<User> {
    if (!validateEmail(item.email)) {
      throw new Error('Invalid email address');
    }
    
    const id = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    const newUser = new UserImpl(id, item.name, item.email, item.role);
    
    this.users.push(newUser);
    return newUser;
  }

  /**
   * Update an existing user
   */
  async update(id: number, item: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    const user = this.users[index];
    
    if (item.name) user.name = item.name;
    if (item.email) {
      if (!validateEmail(item.email)) {
        throw new Error('Invalid email address');
      }
      user.email = item.email;
    }
    if (item.role) user.role = item.role;
    
    return user;
  }

  /**
   * Delete a user
   */
  async delete(id: number): Promise<boolean> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}
