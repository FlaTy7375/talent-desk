import { Router } from "express";
import prisma from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachResolvedAvatars } from "../services/avatar.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"];

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        _count: {
          select: {
            cvs: true,
            projects: true,
          },
        },
      },
    });

    await attachResolvedAvatars(users);

    res.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isBlocked: user.isBlocked,
        version: user.version,
        createdAt: user.createdAt,
        cvCount: user._count.cvs,
        projectCount: user._count.projects,
        isCurrentUser: user.id === req.user.id,
      })),
    });
  } catch (err) {
    console.error("GET /admin/users", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { role, isBlocked, version } = req.body;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role", allowed: ROLES });
    }
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ error: "isBlocked must be boolean" });
    }
    if (version == null) {
      return res.status(400).json({ error: "version is required" });
    }

    const updated = await prisma.user.updateMany({
      where: { id: req.params.id, version: Number(version) },
      data: {
        role,
        isBlocked,
        version: { increment: 1 },
      },
    });
    if (!updated.count) {
      const exists = await prisma.user.findUnique({ where: { id: req.params.id } });
      return res.status(exists ? 409 : 404).json({
        error: exists ? "Version conflict" : "User not found",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
        version: user.version,
      },
    });
  } catch (err) {
    console.error("PATCH /admin/users/:id", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : [];
    if (!ids.length) return res.status(400).json({ error: "ids[] required" });
    if (!supabaseAdmin) {
      return res.status(503).json({
        error: "SUPABASE_SECRET_KEY is required to delete auth users",
      });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, supabaseId: true, email: true },
    });

    const deletedIds = [];
    const failures = [];



    for (const user of users) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
      if (error) {
        failures.push({ id: user.id, email: user.email, error: error.message });
      } else {
        deletedIds.push(user.id);
      }
    }

    if (deletedIds.length) {

      await prisma.user.deleteMany({ where: { id: { in: deletedIds } } });
    }

    res.status(failures.length ? 207 : 200).json({
      deleted: deletedIds.length,
      deletedIds,
      failures,
    });
  } catch (err) {
    console.error("DELETE /admin/users", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
