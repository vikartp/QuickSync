/**
 * Auth utilities — manages JWT token storage and user state.
 */

/** Store JWT token after login. */
export function setToken(token: string) {
  localStorage.setItem('quicksync_token', token);
}

/** Get the stored JWT token. */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('quicksync_token');
}

/** Remove the JWT token (logout). */
export function removeToken() {
  localStorage.removeItem('quicksync_token');
}

/** Check if a user is currently authenticated. */
export function isAuthenticated(): boolean {
  return !!getToken();
}
