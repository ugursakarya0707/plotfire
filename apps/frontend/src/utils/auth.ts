/**
 * Auth utility functions for handling authentication related operations
 */

/**
 * Gets the authentication header with the JWT token
 * @returns Authentication header object or empty object if no token exists
 */
export const getAuthHeader = (): Record<string, string> | {} => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Gets the current user ID from the JWT token
 * @returns User ID or null if no token exists
 */
export const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  try {
    // JWT token consists of three parts: header, payload, and signature
    // We only need the payload part which is the second part
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    
    return decodedPayload.id || decodedPayload.sub || null;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

/**
 * Checks if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  try {
    // Check if token is expired
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if the token has an expiration time
    if (!decodedPayload.exp) {
      return true;
    }
    
    // Check if the token is expired
    const expirationTime = decodedPayload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime < expirationTime;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};
