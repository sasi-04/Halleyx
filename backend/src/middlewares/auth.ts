import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService, JwtPayload } from "../services/authService";
import { UserRole } from "@prisma/client";

const authService = new AuthService();

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const [, token] = header.split(" ");
  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing Authorization header" });
  }
  try {
    req.user = authService.verify(token);
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

