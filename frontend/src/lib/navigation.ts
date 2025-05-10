/**
 * Simple navigation helper for client-side navigation
 */

// Helper for client-side navigation
export const navigate = (path: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
};

// Navigate without page reload if using a router
export const softNavigate = (path: string) => {
  if (typeof window !== 'undefined') {
    // Check if we have a history API
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', path);
      // Dispatch a popstate event to notify any listeners
      const event = new PopStateEvent('popstate');
      window.dispatchEvent(event);
      return;
    }
    
    // Fallback to regular navigation
    window.location.href = path;
  }
};

// Redirect to a URL (useful for auth redirects)
export const redirect = (url: string) => {
  if (typeof window !== 'undefined') {
    window.location.replace(url);
  }
}; 