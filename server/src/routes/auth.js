import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { resolveUserAvatarUrl } from "../services/avatar.js";
import { resolveUserDisplayName } from "../services/displayName.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const [avatarUrl, name] = await Promise.all([
    resolveUserAvatarUrl(req.user.id, req.user.avatarUrl),
    resolveUserDisplayName(req.user.id, req.user.name),
  ]);

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name,
      avatarUrl,
      role: req.user.role,
    },
  });
});

router.post("/dev/set-role", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const { role } = req.body;
  const allowed = ["CANDIDATE", "RECRUITER", "ADMIN"];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: "Invalid role", allowed });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { role },
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

export default router;
