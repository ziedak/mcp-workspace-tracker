#!/bin/bash

# =====================================================================
# Phase 2 Testing - Sample Workspace Creator
# =====================================================================
# 
# This script creates a basic sample workspace with TypeScript files
# for testing the MCP workspace-tracker's Phase 2 features.
#
# Usage:
#   mkdir -p /tmp/mcp-sample-test
#   bash ./cli/phase2-test-scripts/create-sample-workspace.sh
#
# The sample workspace will be created at:
#   /tmp/mcp-sample-test/sample-workspace/
#
# =====================================================================


# Script to create a sample workspace for testing MCP Server

# Define directory structure directly in the temp directory
SAMPLE_DIR="/tmp/mcp-sample-test/sample-workspace"
SRC_DIR="$SAMPLE_DIR/src"
UTILS_DIR="$SRC_DIR/utils"
MODELS_DIR="$SRC_DIR/models"
SERVICES_DIR="$SRC_DIR/services"
TESTS_DIR="$SAMPLE_DIR/tests"

# Create directories
mkdir -p $UTILS_DIR $MODELS_DIR $SERVICES_DIR $TESTS_DIR

# Create package.json
cat > $SAMPLE_DIR/package.json << 'EOL'
{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "Sample workspace for testing MCP Server",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.17.1"
  },
  "devDependencies": {
    "jest": "^27.0.0"
  }
}
EOL

# Create tsconfig.json
cat > $SAMPLE_DIR/tsconfig.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
EOL

# Create .gitignore
cat > $SAMPLE_DIR/.gitignore << 'EOL'
node_modules/
dist/
coverage/
.mcp-cache/
EOL

# Create interface file
cat > $MODELS_DIR/interfaces.ts << 'EOL'
/**
 * User interface representing a system user
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

/**
 * Enum for user roles
 */
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Service interface for data operations
 */
export interface DataService<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: number, item: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}
EOL

# Create class implementation
cat > $MODELS_DIR/User.ts << 'EOL'
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
EOL

# Create utility file
cat > $UTILS_DIR/helpers.ts << 'EOL'
/**
 * Format a date to a readable string
 * @param date The date to format
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Validate an email address
 * @param email The email to validate
 */
export function validateEmail(email: string): boolean {
  const re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  return re.test(email);
}

/**
 * Generate a random ID
 */
export function generateId(): number {
  return Math.floor(Math.random() * 10000);
}
EOL

# Create service implementation
cat > $SERVICES_DIR/UserService.ts << 'EOL'
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
EOL

# Create index file
cat > $SRC_DIR/index.ts << 'EOL'
import { UserService } from './services/UserService';
import { formatDate } from './utils/helpers';
import { UserRole } from './models/interfaces';

/**
 * Application entry point
 */
async function main() {
  console.log('Starting sample application...');
  
  const userService = new UserService();
  
  // List all users
  const users = await userService.findAll();
  console.log('All users:');
  users.forEach(user => {
    console.log(`- ${user.name} (${user.email}), Role: ${user.role}, Created: ${formatDate(user.createdAt)}`);
  });
  
  // Create a new user
  const newUser = await userService.create({
    name: 'New User',
    email: 'new@example.com',
    role: UserRole.EDITOR,
    createdAt: new Date()
  });
  
  console.log(`Created new user: ${newUser.name} with ID ${newUser.id}`);
  
  // Update a user
  const updatedUser = await userService.update(2, { name: 'Updated Editor' });
  if (updatedUser) {
    console.log(`Updated user: ${updatedUser.name}`);
  }
  
  // Delete a user
  const deleted = await userService.delete(3);
  console.log(`Deleted user with ID 3: ${deleted}`);
  
  // Final user count
  const finalUsers = await userService.findAll();
  console.log(`Final user count: ${finalUsers.length}`);
}

main().catch(error => {
  console.error('Application error:', error);
});
EOL

# Create a test file
cat > $TESTS_DIR/User.test.ts << 'EOL'
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
EOL

echo "Sample workspace created successfully at $SAMPLE_DIR"
