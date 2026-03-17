import { prisma } from "../models/prisma";

/**
 * Unified audit logging service.
 * All controllers should use this instead of duplicated local helpers.
 */
export class AuditService {
  /**
   * Create an audit log entry for a workflow action.
   */
  static async log(
    requestId: string,
    action: string,
    userId: string,
    comments?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          request_id: requestId,
          action,
          user_id: userId,
          comments: comments ?? null,
        },
      });
    } catch (error) {
      // If the request doesn't exist (e.g. just deleted), log to console
      console.error("Failed to create audit log:", error);
    }
  }

  /**
   * Retrieve audit logs for a specific request.
   */
  static async getByRequest(requestId: string) {
    return prisma.auditLog.findMany({
      where: { request_id: requestId },
      orderBy: { timestamp: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Retrieve audit logs for a specific user.
   */
  static async getByUser(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        request: { select: { id: true, request_type: true, status: true } },
      },
    });
  }
}
