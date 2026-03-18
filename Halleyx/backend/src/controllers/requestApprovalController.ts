import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../models/prisma";
import { AuthedRequest } from "../middlewares/auth";
import { ApprovalLevel, SimpleRequestStatus } from "@prisma/client";

const approveSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});

/**
 * POST /api/request/approve
 *
 * Stable/simple approval API:
 * MANAGER -> HR -> CEO -> DONE
 */
export async function approveOrRejectRequest(req: AuthedRequest, res: Response) {
  try {
    const parsed = approveSchema.parse(req.body);
    const { requestId, action } = parsed;
    const sendEmail = require("../utils/sendEmail");

    console.log("APPROVE HIT:", requestId, action);

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { createdBy: true },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    //------------------------------------------
    // REJECT FLOW
    //------------------------------------------

    if (action === "REJECT") {
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: "rejected" as any,
          simple_status: SimpleRequestStatus.REJECTED,
        },
      });

      await sendEmail(
        request.createdBy?.email,
        "Request Rejected",
        "Your request was rejected",
      );

      console.log("REJECT EMAIL SENT");

      return res.json({ message: "Rejected" });
    }

    //------------------------------------------
    // APPROVAL FLOW
    //------------------------------------------

    let nextRole = null;
    let nextEmail = null;

    if (request.currentLevel === ApprovalLevel.MANAGER) {
      nextRole = ApprovalLevel.HR;
      nextEmail = "mathansmathan27@gmail.com";
    } else if (request.currentLevel === ApprovalLevel.HR) {
      nextRole = ApprovalLevel.CEO;
      nextEmail = "sasidharan.n.s54@gmail.com";
    }

    //------------------------------------------
    // FINAL APPROVAL
    //------------------------------------------

    if (!nextRole) {
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: "approved" as any,
          simple_status: SimpleRequestStatus.APPROVED,
        },
      });

      await sendEmail(
        request.createdBy?.email,
        "Request Approved",
        "Your request is fully approved",
      );

      console.log("FINAL EMAIL SENT");

      return res.json({ message: "Final Approved" });
    }

    //------------------------------------------
    // MOVE TO NEXT ROLE
    //------------------------------------------

    await prisma.request.update({
      where: { id: requestId },
      data: {
        currentLevel: nextRole,
        status: "pending" as any,
        simple_status: SimpleRequestStatus.PENDING,
      },
    });

    await sendEmail(
      nextEmail,
      "Approval Needed",
      `Request moved to ${nextRole}`,
    );

    console.log("MOVED TO:", nextRole, "EMAIL:", nextEmail);

    res.json({ message: "Moved to next level" });
  } catch (err: any) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: err?.message ?? "Approval failed" });
  }
}

