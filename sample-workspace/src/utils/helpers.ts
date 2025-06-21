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
