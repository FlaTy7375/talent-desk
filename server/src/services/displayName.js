import prisma from "../lib/prisma.js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function readNameParts(userId) {
  const values = await prisma.attributeValue.findMany({
    where: {
      userId,
      attribute: { name: { in: ["First Name", "Last Name"] } },
    },
    select: {
      value: true,
      attribute: { select: { name: true } },
    },
  });

  const parts = { first: "", last: "" };
  for (const row of values) {
    if (row.attribute.name === "First Name") parts.first = asText(row.value);
    if (row.attribute.name === "Last Name") parts.last = asText(row.value);
  }
  return parts;
}

function composeName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim() || null;
}

export async function syncUserDisplayName(userId) {
  const { first, last } = await readNameParts(userId);
  const name = composeName(first, last);
  if (!name) return null;

  await prisma.user.update({
    where: { id: userId },
    data: { name },
  });
  return name;
}

export async function resolveUserDisplayName(userId, currentName = null) {
  const { first, last } = await readNameParts(userId);
  const fromProfile = composeName(first, last);
  if (fromProfile) {
    if (fromProfile !== currentName) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: fromProfile },
      });
    }
    return fromProfile;
  }
  return currentName || null;
}

export async function attachResolvedDisplayNames(users, options = {}) {
  const list = (users || []).filter(Boolean);
  if (!list.length) return;

  const values = await prisma.attributeValue.findMany({
    where: {
      userId: { in: list.map((user) => user.id) },
      attribute: { name: { in: ["First Name", "Last Name"] } },
    },
    select: {
      userId: true,
      value: true,
      attribute: { select: { name: true } },
    },
  });

  const partsByUser = new Map();
  for (const row of values) {
    const parts = partsByUser.get(row.userId) || { first: "", last: "" };
    if (row.attribute.name === "First Name") parts.first = asText(row.value);
    if (row.attribute.name === "Last Name") parts.last = asText(row.value);
    partsByUser.set(row.userId, parts);
  }

  const toSync = [];
  for (const user of list) {
    const parts = partsByUser.get(user.id);
    if (!parts) continue;
    const name = composeName(parts.first, parts.last);
    if (name && name !== user.name) {
      user.name = name;
      toSync.push({ id: user.id, name });
    }
  }


  if (!options.persist || !toSync.length) return;

  await Promise.all(
    toSync.map(({ id, name }) =>
      prisma.user.update({ where: { id }, data: { name } })
    )
  );
}

export async function maybeSyncDisplayName(userId, attribute) {
  if (attribute?.name === "First Name" || attribute?.name === "Last Name") {
    return syncUserDisplayName(userId);
  }
  return null;
}
