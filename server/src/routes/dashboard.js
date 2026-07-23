import { Router } from "express";
import prisma from "../lib/prisma.js";
import { optionalAuth } from "../middleware/auth.js";
import { evaluatePositionAccess } from "../services/positionAccess.js";
import { attachResolvedDisplayNames } from "../services/displayName.js";
import { attachResolvedAvatars } from "../services/avatar.js";

const router = Router();

function positionDto(position) {
  return {
    id: position.id,
    title: position.title,
    company: position.company,
    level: position.level,
    shortDescription: position.shortDescription,
    imageUrl: position.imageUrl || null,
    updatedAt: position.updatedAt,
    cvCount: position._count.cvs,
  };
}

router.get("/home", async (_req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      latest,
      popular,
      totalPositions,
      totalCandidates,
      totalRecruiters,
      totalCvs,
      cvsLast24h,
      tags,
    ] = await Promise.all([
      prisma.position.findMany({
        where: { isPublic: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { _count: { select: { cvs: true } } },
      }),
      prisma.position.findMany({
        where: { isPublic: true },
        orderBy: { cvs: { _count: "desc" } },
        take: 5,
        include: { _count: { select: { cvs: true } } },
      }),
      prisma.position.count(),
      prisma.user.count({ where: { role: "CANDIDATE" } }),
      prisma.user.count({ where: { role: "RECRUITER" } }),
      prisma.cv.count(),
      prisma.cv.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.tag.findMany({
        take: 50,
        include: {
          _count: { select: { projects: true, positions: true } },
        },
      }),
    ]);

    const tagCloud = tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        count: tag._count.projects + tag._count.positions,
      }))
      .filter((tag) => tag.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      latest: latest.map(positionDto),
      popular: popular.map(positionDto),
      tagCloud,
      stats: {
        cvsLast24h,
        totalPositions,
        totalCandidates,
        totalRecruiters,
        totalCvs,
      },
    });
  } catch (err) {
    console.error("GET /dashboard/home", err);
    res.status(500).json({ error: err.message });
  }
});

async function filterPositionsForCandidate(positions, userId) {
  const restricted = positions.filter((position) => !position.isPublic);
  if (!restricted.length) return positions;
  const attributeIds = [
    ...new Set(
      restricted.flatMap((position) =>
        Array.isArray(position.accessRules)
          ? position.accessRules.map((rule) => rule.attributeId)
          : []
      )
    ),
  ];
  const values = await prisma.attributeValue.findMany({
    where: { userId, attributeId: { in: attributeIds } },
  });
  const map = new Map(values.map((value) => [value.attributeId, value.value]));
  return positions.filter(
    (position) => position.isPublic || evaluatePositionAccess(position, map)
  );
}

router.get("/suggestions", optionalAuth, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.json({ positions: [], cvs: [] });

    const manager = req.user?.role === "RECRUITER" || req.user?.role === "ADMIN";
    let positions = await prisma.position.findMany({
      where: {
        ...(req.user ? {} : { isPublic: true }),
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { company: { contains: query, mode: "insensitive" } },
          { shortDescription: { contains: query, mode: "insensitive" } },
          {
            projectTags: {
              some: {
                tag: { name: { contains: query, mode: "insensitive" } },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { _count: { select: { cvs: true } } },
    });

    if (req.user && !manager) {
      positions = await filterPositionsForCandidate(positions, req.user.id);
    }

    const foundCvs = manager
      ? await prisma.cv.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
              { position: { title: { contains: query, mode: "insensitive" } } },
            ],
          },
          take: 3,
          orderBy: { updatedAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            position: { select: { id: true, title: true, company: true } },
          },
        })
      : [];

    await attachResolvedDisplayNames(foundCvs.map((cv) => cv.user));
    await attachResolvedAvatars(foundCvs.map((cv) => cv.user));

    res.json({
      positions: positions.slice(0, 5).map(positionDto),
      cvs: foundCvs.map((cv) => ({
        id: cv.id,
        candidate: cv.user,
        position: cv.position,
      })),
    });
  } catch (err) {
    console.error("GET /dashboard/suggestions", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", optionalAuth, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json({ positions: [], cvs: [] });



    const positionIds = await prisma.$queryRaw`
      SELECT p.id
      FROM positions p
      WHERE (
        to_tsvector(
          'simple',
          concat_ws(' ', p.title, p.short_description, p.company, p.level::text)
        ) @@ plainto_tsquery('simple', ${query})
        OR p.title ILIKE '%' || ${query} || '%'
        OR p.company ILIKE '%' || ${query} || '%'
        OR p.short_description ILIKE '%' || ${query} || '%'
        OR EXISTS (
          SELECT 1
          FROM position_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.position_id = p.id
            AND (
              to_tsvector('simple', t.name)
                @@ plainto_tsquery('simple', ${query})
              OR t.name ILIKE '%' || ${query} || '%'
            )
        )
      )
      ORDER BY p.updated_at DESC
      LIMIT 50
    `;

    let positions = await prisma.position.findMany({
      where: { id: { in: positionIds.map((row) => row.id) } },
      include: { _count: { select: { cvs: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const manager = req.user?.role === "RECRUITER" || req.user?.role === "ADMIN";
    if (!req.user) {
      positions = positions.filter((position) => position.isPublic);
    } else if (!manager) {
      positions = await filterPositionsForCandidate(positions, req.user.id);
    }

    let cvs = [];
    if (manager) {
      const cvIds = await prisma.$queryRaw`
        SELECT DISTINCT c.id
        FROM cvs c
        JOIN users u ON u.id = c.user_id
        JOIN positions p ON p.id = c.position_id
        WHERE c.status::text = 'PUBLISHED'
          AND (
            to_tsvector(
              'simple',
              concat_ws(' ', u.name, u.email, p.title, p.company)
            ) @@ plainto_tsquery('simple', ${query})
            OR EXISTS (
              SELECT 1
              FROM attribute_values av
              WHERE av.user_id = c.user_id
                AND to_tsvector('simple', av.value::text)
                    @@ plainto_tsquery('simple', ${query})
            )
            OR EXISTS (
              SELECT 1
              FROM projects pr
              WHERE pr.user_id = c.user_id
                AND (
                  to_tsvector(
                    'simple',
                    concat_ws(' ', pr.name, pr.description)
                  ) @@ plainto_tsquery('simple', ${query})
                  OR EXISTS (
                    SELECT 1
                    FROM project_tags prt
                    JOIN tags t ON t.id = prt.tag_id
                    WHERE prt.project_id = pr.id
                      AND to_tsvector('simple', t.name)
                          @@ plainto_tsquery('simple', ${query})
                  )
                )
            )
          )
        LIMIT 50
      `;

      const found = await prisma.cv.findMany({
        where: { id: { in: cvIds.map((row) => row.id) } },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          position: true,
          _count: { select: { likes: true } },
        },
      });



      const restricted = found.filter((cv) => !cv.position.isPublic);
      const allAttributeIds = [
        ...new Set(
          restricted.flatMap((cv) =>
            Array.isArray(cv.position.accessRules)
              ? cv.position.accessRules.map((rule) => rule.attributeId)
              : []
          )
        ),
      ];
      const allValues = restricted.length
        ? await prisma.attributeValue.findMany({
            where: {
              userId: { in: [...new Set(restricted.map((cv) => cv.userId))] },
              attributeId: { in: allAttributeIds },
            },
          })
        : [];
      const maps = new Map();
      allValues.forEach((value) => {
        if (!maps.has(value.userId)) maps.set(value.userId, new Map());
        maps.get(value.userId).set(value.attributeId, value.value);
      });
      const visible = found.filter(
        (cv) =>
          cv.position.isPublic ||
          evaluatePositionAccess(cv.position, maps.get(cv.userId) || new Map())
      );

      cvs = visible.map((cv) => ({
        id: cv.id,
        candidate: cv.user,
        position: {
          id: cv.position.id,
          title: cv.position.title,
          company: cv.position.company,
        },
        likes: cv._count.likes,
        updatedAt: cv.updatedAt,
      }));
      await Promise.all([
        attachResolvedDisplayNames(cvs.map((cv) => cv.candidate)),
        attachResolvedAvatars(cvs.map((cv) => cv.candidate)),
      ]);
    }

    res.json({
      positions: positions.map(positionDto),
      cvs,
    });
  } catch (err) {
    console.error("GET /dashboard/search", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
