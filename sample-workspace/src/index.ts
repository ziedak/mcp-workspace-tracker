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
