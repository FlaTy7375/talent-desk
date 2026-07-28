import prisma from "../lib/prisma.js";

/** Resolve profile owner — self or another user when admin. */
export async function resolveOwner(req, res) {
  const requested = String(req.query.userId || req.body?.ownerId || "").trim();
  if (!requested || requested === req.user.id) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
      version: req.user.version,
    };
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Only admin can edit another profile" });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: requested },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      version: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}
