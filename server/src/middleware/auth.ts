import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { db } from '../db/store.js';
import { User, UserRole } from '../types/index.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
      workspaceId?: string;
      workspaceRole?: UserRole;
    }
  }
}

/**
 * Middleware: Requires a valid session Bearer token
 * Returns 401 Unauthorized if missing, invalid, or expired
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in.',
        code: 'AUTH_REQUIRED',
      });
    }

    const authContext = await AuthService.validateSession(token);
    if (!authContext) {
      return res.status(401).json({
        error: 'Invalid or expired session. Please sign in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    req.user = authContext.user;
    req.sessionToken = authContext.sessionToken;
    req.workspaceId = authContext.workspace.id;
    req.workspaceRole = authContext.role;

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      error: 'Authentication validation failed',
      code: 'AUTH_FAILED',
    });
  }
}

/**
 * Middleware: Verifies user membership and authorization for the target workspace
 * Returns 403 Forbidden if the user lacks access to the requested workspace
 */
export async function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const paramTenant = Array.isArray(req.params.tenantId) ? req.params.tenantId[0] : req.params.tenantId;
    const paramWorkspace = Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId;
    const headerWorkspace = req.headers['x-workspace-id'] ? String(req.headers['x-workspace-id']) : undefined;
    const queryTenant = req.query.tenantId ? String(req.query.tenantId) : undefined;

    let targetWorkspaceId: string | undefined = 
      paramTenant ||
      paramWorkspace ||
      headerWorkspace ||
      queryTenant ||
      req.workspaceId;

    if (!targetWorkspaceId) {
      // Fetch user's first available workspace
      const userWorkspaces = await db.getUserWorkspaces(req.user.id);
      if (userWorkspaces.length > 0) {
        targetWorkspaceId = userWorkspaces[0].id;
      } else {
        return res.status(403).json({
          error: 'No active workspace found for user',
          code: 'NO_WORKSPACE',
        });
      }
    }

    // Check membership authorization
    const isMember = await db.isUserInWorkspace(req.user.id, targetWorkspaceId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this workspace',
        code: 'WORKSPACE_FORBIDDEN',
      });
    }

    const role = (await db.getUserWorkspaceRole(req.user.id, targetWorkspaceId)) || 'MEMBER';
    req.workspaceId = targetWorkspaceId;
    req.workspaceRole = role;

    next();
  } catch (err: any) {
    console.error('Workspace authorization error:', err);
    return res.status(403).json({
      error: 'Workspace authorization failed',
      code: 'WORKSPACE_AUTH_FAILED',
    });
  }
}

/**
 * Middleware: Optional authentication. Attaches user if token is present, continues otherwise.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }

    if (token) {
      const authContext = await AuthService.validateSession(token);
      if (authContext) {
        req.user = authContext.user;
        req.sessionToken = authContext.sessionToken;
        req.workspaceId = authContext.workspace.id;
        req.workspaceRole = authContext.role;
      }
    }
    next();
  } catch {
    next();
  }
}
