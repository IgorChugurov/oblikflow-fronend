/**
 * Navigation utilities for cross-application routing
 * 
 * These functions handle navigation between different subdomains/applications
 */

// Environment-based URLs - can be overridden via environment variables
const getBaseUrl = (subdomain: string): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variables or default
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
    
    if (subdomain === 'public') {
      return process.env.NEXT_PUBLIC_PUBLIC_URL || `${protocol}://${host}`;
    }
    if (subdomain === 'app') {
      return process.env.NEXT_PUBLIC_APP_URL || `${protocol}://app.${host}`;
    }
    if (subdomain === 'workspace') {
      return process.env.NEXT_PUBLIC_WORKSPACE_URL || `${protocol}://workspace.${host}`;
    }
  } else {
    // Client-side: use current origin
    const host = window.location.host;
    const protocol = window.location.protocol;
    
    if (subdomain === 'public') {
      // Remove subdomain if present
      const baseHost = host.replace(/^(app|workspace)\./, '');
      return `${protocol}//${baseHost}`;
    }
    if (subdomain === 'app') {
      const baseHost = host.replace(/^(app|workspace)\./, '');
      return `${protocol}//app.${baseHost}`;
    }
    if (subdomain === 'workspace') {
      const baseHost = host.replace(/^(app|workspace)\./, '');
      return `${protocol}//workspace.${baseHost}`;
    }
  }
  
  return '';
};

/**
 * Get URL for public application (main site)
 */
export const getPublicUrl = (path: string = ''): string => {
  const baseUrl = getBaseUrl('public');
  return `${baseUrl}${path}`;
};

/**
 * Get URL for app application (project management)
 */
export const getAppUrl = (path: string = ''): string => {
  const baseUrl = getBaseUrl('app');
  return `${baseUrl}${path}`;
};

/**
 * Get URL for workspace application
 */
export const getWorkspaceUrl = (projectId?: string, path: string = ''): string => {
  const baseUrl = getBaseUrl('workspace');
  const query = projectId ? `?project=${projectId}` : '';
  return `${baseUrl}${path}${query}`;
};

/**
 * Navigate to public application
 */
export const navigateToPublic = (path: string = '') => {
  if (typeof window !== 'undefined') {
    window.location.href = getPublicUrl(path);
  }
};

/**
 * Navigate to app application (project management)
 */
export const navigateToApp = (path: string = '') => {
  if (typeof window !== 'undefined') {
    window.location.href = getAppUrl(path);
  }
};

/**
 * Navigate to workspace application with project ID
 */
export const navigateToWorkspace = (projectId: string, path: string = '') => {
  if (typeof window !== 'undefined') {
    window.location.href = getWorkspaceUrl(projectId, path);
  }
};
