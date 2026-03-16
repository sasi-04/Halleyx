import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { UserRole, RequestStatus, ExecutionStatus } from "@prisma/client";
import { AuthService } from "../services/authService";
import { z } from "zod";
import bcrypt from "bcrypt";

const authService = new AuthService();

// ==================== DASHBOARD ====================

export async function getAdminDashboard(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const [
      totalUsers,
      totalRequests,
      pendingRequests,
      completedWorkflows,
      failedExecutions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.request.count(),
      prisma.request.count({
        where: { status: { in: [RequestStatus.pending, RequestStatus.in_progress] } }
      }),
      prisma.execution.count({
        where: { status: ExecutionStatus.completed }
      }),
      prisma.execution.count({
        where: { status: ExecutionStatus.failed }
      })
    ]);

    res.json({
      totalUsers,
      totalRequests,
      pendingRequests,
      completedWorkflows,
      failedExecutions
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load dashboard" });
  }
}

// ==================== USER MANAGEMENT ====================

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  department: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  department: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export async function createUser(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const parsed = createUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        password: hashedPassword,
        role: parsed.role,
        department: parsed.department
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(StatusCodes.CREATED).json(user);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to create user" });
  }
}

export async function getUsers(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { page = "1", pageSize = "20", search = "", role: roleFilter, department } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } }
      ];
    }
    if (roleFilter) where.role = roleFilter as UserRole;
    if (department) where.department = department as string;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load users" });
  }
}

export async function updateUser(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const parsed = updateUserSchema.parse(req.body);

    const updateData: any = { ...parsed };
    if (parsed.email) {
      updateData.email = parsed.email.toLowerCase();
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json(user);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }
    if (err.code === 'P2002') {
      return res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to update user" });
  }
}

export async function deleteUser(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to delete user" });
  }
}

export async function resetUserPassword(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: "Password reset successfully" });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to reset password" });
  }
}

// ==================== WORKFLOW BUILDER ====================

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  input_schema: z.record(z.any()).optional()
});

const createStepSchema = z.object({
  name: z.string().min(1).max(200),
  step_type: z.enum(["task", "approval", "notification"]),
  order: z.number().int().min(1),
  approver_role: z.enum(["EMPLOYEE", "MANAGER", "HR", "CEO", "FINANCE"]).optional(),
  metadata: z.record(z.any()).optional()
});

export async function createWorkflow(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const parsed = createWorkflowSchema.parse(req.body);

    // Get the latest version for this workflow name
    const latestWorkflow = await prisma.workflow.findFirst({
      where: { name: parsed.name },
      orderBy: { version: "desc" }
    });

    const workflow = await prisma.workflow.create({
      data: {
        name: parsed.name,
        version: (latestWorkflow?.version || 0) + 1,
        is_active: false,
        input_schema: parsed.input_schema || {}
      }
    });

    res.status(StatusCodes.CREATED).json(workflow);
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to create workflow" });
  }
}

export async function getWorkflows(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { page = "1", pageSize = "20", search = "" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (search) {
      where.name = { contains: search as string, mode: "insensitive" };
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { updated_at: "desc" },
        include: {
          steps: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              name: true,
              step_type: true,
              order: true,
              metadata: true
            }
          },
          _count: {
            select: { executions: true }
          }
        }
      }),
      prisma.workflow.count({ where })
    ]);

    res.json({
      workflows,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load workflows" });
  }
}

export async function updateWorkflow(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { name, description, is_active, input_schema } = req.body;

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
        ...(input_schema && { input_schema })
      },
      include: {
        steps: {
          orderBy: { order: "asc" }
        }
      }
    });

    res.json(workflow);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Workflow not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to update workflow" });
  }
}

export async function deleteWorkflow(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    await prisma.workflow.delete({
      where: { id }
    });

    res.json({ message: "Workflow deleted successfully" });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Workflow not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to delete workflow" });
  }
}

export async function addWorkflowStep(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { workflowId } = req.params;
    const parsed = createStepSchema.parse(req.body);

    const step = await prisma.step.create({
      data: {
        workflow_id: workflowId,
        name: parsed.name,
        step_type: parsed.step_type,
        order: parsed.order,
        metadata: {
          ...(parsed.approver_role && { approverRole: parsed.approver_role }),
          ...parsed.metadata
        }
      }
    });

    res.status(StatusCodes.CREATED).json(step);
  } catch (err: any) {
    if (err.code === 'P2003') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Workflow not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to add workflow step" });
  }
}

// ==================== AUTOMATION RULES ====================

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  condition: z.string().min(1),
  action: z.string().min(1),
  priority: z.number().int().min(1).default(1),
  is_enabled: z.boolean().default(true)
});

export async function createAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const parsed = createRuleSchema.parse(req.body);

    // For now, we'll store automation rules in a separate table or as metadata
    // This is a simplified implementation
    const rule = await prisma.rule.create({
      data: {
        step_id: "automation-rule", // This would need proper workflow association
        condition: parsed.condition,
        priority: parsed.priority,
        is_default: false
      }
    });

    res.status(StatusCodes.CREATED).json({
      id: rule.id,
      name: parsed.name,
      description: parsed.description,
      condition: parsed.condition,
      action: parsed.action,
      priority: parsed.priority,
      is_enabled: parsed.is_enabled,
      created_at: rule.created_at
    });
  } catch (err: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to create automation rule" });
  }
}

export async function getAutomationRules(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { page = "1", pageSize = "20", enabled } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // This is a simplified implementation - in practice, you'd have a dedicated automation rules table
    const rules = await prisma.rule.findMany({
      skip,
      take: pageSizeNum,
      orderBy: { priority: "asc" },
      include: {
        step: {
          select: { name: true }
        }
      }
    });

    res.json({
      rules: rules.map(rule => ({
        id: rule.id,
        name: `Rule for ${rule.step.name}`,
        condition: rule.condition,
        priority: rule.priority,
        is_enabled: !rule.is_default,
        created_at: rule.created_at,
        updated_at: rule.updated_at
      })),
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load automation rules" });
  }
}

export async function updateAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { condition, priority, is_enabled } = req.body;

    const rule = await prisma.rule.update({
      where: { id },
      data: {
        ...(condition && { condition }),
        ...(priority && { priority }),
        ...(is_enabled !== undefined && { is_default: !is_enabled })
      }
    });

    res.json(rule);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Rule not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to update automation rule" });
  }
}

export async function deleteAutomationRule(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    await prisma.rule.delete({
      where: { id }
    });

    res.json({ message: "Automation rule deleted successfully" });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Rule not found" });
    }
    res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Failed to delete automation rule" });
  }
}

// ==================== DEPARTMENTS MANAGEMENT ====================

export async function getDepartments(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const departments = await prisma.user.groupBy({
      by: ["department"],
      where: {
        department: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        department: "asc"
      }
    });

    const departmentList = departments.map(dept => ({
      name: dept.department,
      userCount: dept._count.id
    }));

    res.json({ departments: departmentList });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load departments" });
  }
}

// ==================== SYSTEM EXECUTIONS MONITORING ====================

export async function getSystemExecutions(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { page = "1", pageSize = "20", status, workflowId } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (status) where.status = status as ExecutionStatus;
    if (workflowId) where.workflow_id = workflowId as string;

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { started_at: "desc" },
        include: {
          workflow: {
            select: { id: true, name: true, version: true }
          },
          triggeredByUser: {
            select: { id: true, name: true, email: true }
          },
          executionLogs: {
            orderBy: { started_at: "desc" },
            take: 1
          }
        }
      }),
      prisma.execution.count({ where })
    ]);

    res.json({
      executions,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load executions" });
  }
}

// ==================== AUDIT LOGS ====================

export async function getAuditLogs(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const { page = "1", pageSize = "50", action, userId, requestId } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 50;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (action) where.action = action as string;
    if (userId) where.user_id = userId as string;
    if (requestId) where.request_id = requestId as string;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          },
          request: {
            select: { id: true, request_type: true, status: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load audit logs" });
  }
}

// ==================== ANALYTICS ====================

export async function getAnalytics(req: AuthedRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Not authenticated" });
    if (role !== UserRole.ADMIN) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
    }

    const [
      requestsByType,
      requestsByStatus,
      executionsByStatus,
      usersByRole,
      departments,
      recentActivity
    ] = await Promise.all([
      prisma.request.groupBy({
        by: ["request_type"],
        _count: { id: true }
      }),
      prisma.request.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      prisma.execution.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { id: true }
      }),
      prisma.user.groupBy({
        by: ["department"],
        where: { department: { not: null } },
        _count: { id: true }
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 10,
        include: {
          user: {
            select: { name: true, role: true }
          }
        }
      })
    ]);

    res.json({
      requestsByType,
      requestsByStatus,
      executionsByStatus,
      usersByRole,
      departments,
      recentActivity
    });
  } catch (err: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err?.message ?? "Failed to load analytics" });
  }
}
