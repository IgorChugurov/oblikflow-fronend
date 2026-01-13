/**
 * Navigation utilities for cross-application routing
 *
 * These functions handle navigation between different subdomains/applications
 */

// Environment-based URLs - can be overridden via environment variables
const getBaseUrl = (app: string): string => {
  if (typeof window === "undefined") {
    // Server-side: use environment variables or default
    const protocol =
      typeof process !== "undefined" && process.env?.NODE_ENV === "production"
        ? "https"
        : "http";
    const host =
      (typeof process !== "undefined" &&
        process.env?.NEXT_PUBLIC_BASE_DOMAIN) ||
      "localhost:3000";

    if (app === "site") {
      return (
        (typeof process !== "undefined" &&
          process.env?.NEXT_PUBLIC_SITE_URL) ||
        `${protocol}://${host}`
      );
    }
    if (app === "admin") {
      return (
        (typeof process !== "undefined" &&
          process.env?.NEXT_PUBLIC_ADMIN_URL) ||
        `${protocol}://admin.${host}`
      );
    }
    if (app === "workspace") {
      return (
        (typeof process !== "undefined" &&
          process.env?.NEXT_PUBLIC_WORKSPACE_URL) ||
        `${protocol}://workspace.${host}`
      );
    }
    if (app === "platform") {
      return (
        (typeof process !== "undefined" &&
          process.env?.NEXT_PUBLIC_PLATFORM_URL) ||
        `${protocol}://platform.${host}`
      );
    }
  } else {
    // Client-side: use current origin
    const host = window.location.host;
    const protocol = window.location.protocol;

    if (app === "site") {
      // Remove subdomain if present
      const baseHost = host.replace(/^(admin|workspace|platform)\./, "");
      return `${protocol}//${baseHost}`;
    }
    if (app === "admin") {
      const baseHost = host.replace(/^(admin|workspace|platform)\./, "");
      return `${protocol}//admin.${baseHost}`;
    }
    if (app === "workspace") {
      const baseHost = host.replace(/^(admin|workspace|platform)\./, "");
      return `${protocol}//workspace.${baseHost}`;
    }
    if (app === "platform") {
      const baseHost = host.replace(/^(admin|workspace|platform)\./, "");
      return `${protocol}//platform.${baseHost}`;
    }
  }

  return "";
};

/**
 * Get URL for site application (main site)
 */
export const getSiteUrl = (path: string = ""): string => {
  const baseUrl = getBaseUrl("site");
  return `${baseUrl}${path}`;
};

/**
 * Get URL for admin application (project management)
 */
export const getAdminUrl = (path: string = ""): string => {
  const baseUrl = getBaseUrl("admin");
  return `${baseUrl}${path}`;
};

/**
 * Get URL for workspace application
 */
export const getWorkspaceUrl = (
  projectId?: string,
  path: string = ""
): string => {
  const baseUrl = getBaseUrl("workspace");
  const query = projectId ? `?project=${projectId}` : "";
  return `${baseUrl}${path}${query}`;
};

/**
 * Navigate to site application
 */
export const navigateToSite = (path: string = "") => {
  if (typeof window !== "undefined") {
    window.location.href = getSiteUrl(path);
  }
};

/**
 * Navigate to admin application (project management)
 */
export const navigateToAdmin = (path: string = "") => {
  if (typeof window !== "undefined") {
    window.location.href = getAdminUrl(path);
  }
};

/**
 * Get URL for platform application (platform settings)
 */
export const getPlatformUrl = (path: string = ""): string => {
  const baseUrl = getBaseUrl("platform");
  return `${baseUrl}${path}`;
};

/**
 * Navigate to workspace application with project ID
 */
export const navigateToWorkspace = (projectId: string, path: string = "") => {
  if (typeof window !== "undefined") {
    window.location.href = getWorkspaceUrl(projectId, path);
  }
};

/**
 * Navigate to platform application (platform settings)
 */
export const navigateToPlatform = (path: string = "") => {
  if (typeof window !== "undefined") {
    window.location.href = getPlatformUrl(path);
  }
};

// Legacy exports for backward compatibility (deprecated)
/** @deprecated Use getSiteUrl instead */
export const getPublicUrl = getSiteUrl;
/** @deprecated Use navigateToSite instead */
export const navigateToPublic = navigateToSite;
/** @deprecated Use getAdminUrl instead */
export const getAppUrl = getAdminUrl;
/** @deprecated Use navigateToAdmin instead */
export const navigateToApp = navigateToAdmin;
