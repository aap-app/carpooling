import { Request, Response, NextFunction } from "express";

export function getAdminUserId(): string {
  return process.env.ADMIN_USER_ID ?? "48270256";
}

export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  return userId === getAdminUserId();
}

export function requireAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const userId = req.user.claims.sub;
  if (!isAdmin(userId)) {
    return res.status(403).json({ message: "Admin privileges required" });
  }

  next();
}
