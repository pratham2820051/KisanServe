import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from './auth';

type Role = 'Farmer' | 'Service_Provider' | 'Admin';

/**
 * RBAC middleware — restricts endpoint access to specified roles.
 * Requirement 1.6, 18.4: Role-based access control on all API endpoints.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

// Convenience role guards
export const farmerOnly = requireRole('Farmer');
export const providerOnly = requireRole('Service_Provider');
export const adminOnly = requireRole('Admin');
export const farmerOrProvider = requireRole('Farmer', 'Service_Provider');
export const anyRole = requireRole('Farmer', 'Service_Provider', 'Admin');
