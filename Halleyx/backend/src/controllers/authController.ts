import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { AuthService } from "../services/authService";
import { UserRole } from "@prisma/client";
import { AuthedRequest } from "../middlewares/auth";

const authService = new AuthService();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function register(req: { body: unknown }, res: Response) {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await authService.register(parsed);
    res.status(StatusCodes.CREATED).json(user);
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Register failed" });
  }
}

export async function login(req: { body: unknown }, res: Response) {
  try {
    const parsed = loginSchema.parse(req.body);
    // eslint-disable-next-line no-console
    console.log("LOGIN ATTEMPT:", parsed.email);
    const result = await authService.login(parsed.email, parsed.password);
    // eslint-disable-next-line no-console
    console.log("USER FOUND:", result.user?.email);
    // eslint-disable-next-line no-console
    console.log("ROLE:", result.user?.role);
    // eslint-disable-next-line no-console
    console.log("[auth] user logged in", { email: parsed.email, role: result.user?.role });
    res.json(result);
  } catch (err: any) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: err?.message ?? "Login failed" });
  }
}

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function updateProfile(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });

    const parsed = profileSchema.parse(req.body);
    const user = await authService.updateProfile(userId, parsed);
    res.json({ user });
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Update failed" });
  }
}

