import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { db } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/signup
 * Register new user, create their clean workspace, and generate authenticated session
 */
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName, industry } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authResponse = await AuthService.signup({
      email,
      password,
      name,
      businessName,
      industry,
    });

    return res.status(201).json(authResponse);
  } catch (err: any) {
    const message = err.message || 'Signup failed';
    const status = message.includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: message });
  }
});

/**
 * POST /api/auth/login
 * Verify user credentials and generate authenticated session
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authResponse = await AuthService.login({ email, password });
    return res.json(authResponse);
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session token
 */
authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      await AuthService.logout(req.sessionToken);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Fetch current authenticated user, active workspace, and workspace memberships
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaces = await db.getUserWorkspaces(req.user.id);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);
    const activeWorkspaceId = req.workspaceId || sanitizedWorkspaces[0]?.id;
    const activeWorkspace = activeWorkspaceId
      ? db.getSanitizedTenantById(activeWorkspaceId) || sanitizedWorkspaces[0]
      : undefined;

    return res.json({
      user: AuthService.toUserDTO(req.user),
      workspace: activeWorkspace,
      workspaces: sanitizedWorkspaces,
      activeWorkspaceId,
      role: req.workspaceRole || 'MEMBER',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
});

/**
 * POST /api/auth/switch-workspace
 * Switch the active workspace for the current session
 */
authRouter.post('/switch-workspace', requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    if (!req.user || !req.sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedWorkspace = await AuthService.switchWorkspace(req.user.id, workspaceId, req.sessionToken);
    const workspaces = await db.getUserWorkspaces(req.user.id);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);

    return res.json({
      success: true,
      workspace: updatedWorkspace,
      workspaces: sanitizedWorkspaces,
      activeWorkspaceId: updatedWorkspace.id,
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message || 'Failed to switch workspace' });
  }
});

/**
 * POST /api/auth/workspaces
 * Create an additional workspace for current user
 */
authRouter.post('/workspaces', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, businessName, industry, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const newWorkspace = await AuthService.createWorkspace(req.user.id, {
      name,
      businessName,
      industry,
      description,
    });

    const workspaces = await db.getUserWorkspaces(req.user.id);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);

    return res.status(201).json({
      success: true,
      workspace: newWorkspace,
      workspaces: sanitizedWorkspaces,
      activeWorkspaceId: newWorkspace.id,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create workspace' });
  }
});

/**
 * GET /api/auth/workspaces
 * List all workspaces the user has access to
 */
authRouter.get('/workspaces', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const workspaces = await db.getUserWorkspaces(req.user.id);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);
    return res.json(sanitizedWorkspaces);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});
