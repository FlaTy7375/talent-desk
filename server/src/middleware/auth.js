import { supabase } from "../lib/supabase.js";
import prisma from "../lib/prisma.js";

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  // Берём ключ входа из заголовка после слова Bearer.
  return header.slice(7);
}

async function resolveAppUser(accessToken) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }



  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  const authUser = data.user;



  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    create: {
      supabaseId: authUser.id,
      email: authUser.email,
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        null,
      avatarUrl: authUser.user_metadata?.avatar_url || null,
      role: "CANDIDATE",
    },
    update: {
      email: authUser.email,
    },
  });

  return user;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized", message: "No token" });
    }

    const user = await resolveAppUser(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Forbidden", message: "User is blocked" });
    }


    req.user = user;
    next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    return res.status(500).json({ error: "Auth failed", message: err.message });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (token) {
      const user = await resolveAppUser(token);
      if (user && !user.isBlocked) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    console.error("optionalAuth error:", err.message);
    next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
}
