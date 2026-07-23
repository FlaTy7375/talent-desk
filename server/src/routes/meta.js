import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.attributeCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { attributes: true } },
      },
    });
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/attributes", async (_req, res) => {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        category: true,
        options: { orderBy: { sortOrder: "asc" } },
      },
    });
    res.json({ attributes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
