import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/store.js';
import { User, AuthUserDTO, AuthResponse, Tenant, UserRole } from '../types/index.js';

export class AuthService {
  private static readonly SALT_LENGTH = 16;
  private static readonly KEY_LENGTH = 64;
  private static readonly SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
  private static readonly SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Hashes a plaintext password using crypto.scrypt
   */
  public static hashPassword(password: string): string {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, this.KEY_LENGTH, this.SCRYPT_OPTIONS);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies a password against a stored scrypt hash using timing-safe comparison
   */
  public static verifyPassword(password: string, storedHash: string): boolean {
    try {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return false;
      const [salt, key] = parts;
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, this.KEY_LENGTH, this.SCRYPT_OPTIONS);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically random session token
   */
  public static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Converts a User entity to a safe AuthUserDTO without passwordHash
   */
  public static toUserDTO(user: User): AuthUserDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register a new user and create their isolated client workspace
   */
  public static async signup(params: {
    email: string;
    password: string;
    name?: string;
    businessName?: string;
    industry?: string;
  }): Promise<AuthResponse> {
    const normalizedEmail = params.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Valid email address is required');
    }
    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existingUser = await db.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = this.hashPassword(params.password);
    const user = await db.createUser({
      email: normalizedEmail,
      passwordHash,
      name: params.name?.trim() || normalizedEmail.split('@')[0],
      role: 'OWNER',
    });

    // Create fresh, clean client workspace
    const workspaceName = params.businessName?.trim() || `${user.name}'s Business`;
    const workspace = await db.createTenant({
      name: workspaceName,
      businessName: workspaceName,
      businessDescription: `AI Telegram assistant workspace for ${workspaceName}`,
      industry: params.industry?.trim() || 'General Business',
      isDemo: false,
    });

    // Add user as workspace OWNER
    await db.addWorkspaceMember({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER',
    });

    // Generate authenticated session
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MS).toISOString();
    await db.createSession({
      token,
      userId: user.id,
      workspaceId: workspace.id,
      expiresAt,
    });

    const userDTO = this.toUserDTO(user);
    const workspaces = await db.getUserWorkspaces(user.id);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);

    return {
      success: true,
      token,
      user: userDTO,
      workspace: db.getSanitizedTenantById(workspace.id) || workspace,
      workspaces: sanitizedWorkspaces,
      activeWorkspaceId: workspace.id,
    };
  }

  /**
   * Log in an existing user and create a session
   */
  public static async login(params: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const validPassword = this.verifyPassword(params.password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    let workspaces = await db.getUserWorkspaces(user.id);
    if (workspaces.length === 0) {
      // Create initial workspace if somehow none exists
      const workspace = await db.createTenant({
        name: `${user.name}'s Workspace`,
        businessName: `${user.name}'s Business`,
        businessDescription: 'Telegram AI Agent workspace',
        industry: 'General Business',
        isDemo: false,
      });
      await db.addWorkspaceMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER',
      });
      workspaces = [workspace];
    }

    const activeWorkspace = workspaces[0];
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MS).toISOString();

    await db.createSession({
      token,
      userId: user.id,
      workspaceId: activeWorkspace.id,
      expiresAt,
    });

    const userDTO = this.toUserDTO(user);
    const sanitizedWorkspaces = workspaces.map(w => db.getSanitizedTenantById(w.id) || w);

    return {
      success: true,
      token,
      user: userDTO,
      workspace: db.getSanitizedTenantById(activeWorkspace.id) || activeWorkspace,
      workspaces: sanitizedWorkspaces,
      activeWorkspaceId: activeWorkspace.id,
    };
  }

  /**
   * Validates a session token and returns the user, session, and workspace context
   */
  public static async validateSession(token: string): Promise<{
    user: User;
    workspace: Tenant;
    role: UserRole;
    sessionToken: string;
  } | null> {
    if (!token) return null;

    const session = await db.getSession(token);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await db.deleteSession(token);
      return null;
    }

    const user = await db.getUserById(session.userId);
    if (!user) {
      await db.deleteSession(token);
      return null;
    }

    const role = (await db.getUserWorkspaceRole(user.id, session.workspaceId)) || 'OWNER';
    const workspace = await db.getTenantById(session.workspaceId);

    if (!workspace) {
      // Fallback to user's first available workspace
      const userWorkspaces = await db.getUserWorkspaces(user.id);
      if (userWorkspaces.length > 0) {
        session.workspaceId = userWorkspaces[0].id;
        return {
          user,
          workspace: userWorkspaces[0],
          role,
          sessionToken: token,
        };
      }
      return null;
    }

    return {
      user,
      workspace,
      role,
      sessionToken: token,
    };
  }

  /**
   * Switch the active workspace for the current session
   */
  public static async switchWorkspace(userId: string, targetWorkspaceId: string, token: string): Promise<Tenant> {
    const isMember = await db.isUserInWorkspace(userId, targetWorkspaceId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this workspace');
    }

    const session = await db.getSession(token);
    if (session) {
      session.workspaceId = targetWorkspaceId;
    }

    const targetTenant = await db.getTenantById(targetWorkspaceId);
    if (!targetTenant) {
      throw new Error('Workspace not found');
    }

    return db.getSanitizedTenantById(targetWorkspaceId) || targetTenant;
  }

  /**
   * Create an additional workspace for an existing authenticated user
   */
  public static async createWorkspace(userId: string, params: {
    name: string;
    businessName?: string;
    industry?: string;
    description?: string;
  }): Promise<Tenant> {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const workspaceName = params.name.trim();
    if (!workspaceName) {
      throw new Error('Workspace name is required');
    }

    const newWorkspace = await db.createTenant({
      name: workspaceName,
      businessName: params.businessName?.trim() || workspaceName,
      businessDescription: params.description || `AI Telegram assistant workspace for ${workspaceName}`,
      industry: params.industry?.trim() || 'General Business',
      isDemo: false,
    });

    await db.addWorkspaceMember({
      workspaceId: newWorkspace.id,
      userId: user.id,
      role: 'OWNER',
    });

    return db.getSanitizedTenantById(newWorkspace.id) || newWorkspace;
  }

  /**
   * Terminate the session
   */
  public static async logout(token: string): Promise<boolean> {
    return await db.deleteSession(token);
  }
}
