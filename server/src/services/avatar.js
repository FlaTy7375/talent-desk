import prisma from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";

const BUCKET = "profile-images";
const PUBLIC_MARKER = `/object/public/${BUCKET}/`;

function asUrl(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

function storagePathFromUrl(url) {
  const text = asUrl(url);
  if (!text) return null;
  const index = text.indexOf(PUBLIC_MARKER);
  if (index === -1) return null;
  return decodeURIComponent(text.slice(index + PUBLIC_MARKER.length).split("?")[0]);
}

export async function pruneUnusedProfileImages(userId, keepUrl = null) {
  if (!supabaseAdmin || !userId) return;
  try {
    const listed = await supabaseAdmin.storage.from(BUCKET).list(userId, { limit: 100 });
    if (listed.error || !listed.data?.length) return;

    const keepPath = storagePathFromUrl(keepUrl);
    const toRemove = listed.data
      .map((file) => `${userId}/${file.name}`)
      .filter((path) => path !== keepPath);

    if (toRemove.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(toRemove);
    }
  } catch (err) {
    console.warn("pruneUnusedProfileImages:", err.message);
  }
}

export async function syncPersonalPhotoAvatar(userId, value) {
  const avatarUrl = asUrl(value);
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
  await pruneUnusedProfileImages(userId, avatarUrl);
  return avatarUrl;
}

export async function resolveUserAvatarUrl(userId, currentAvatarUrl = null) {
  const photo = await prisma.attributeValue.findFirst({
    where: {
      userId,
      attribute: { name: "Personal Photo" },
    },
    select: { value: true },
  });

  const fromProfile = asUrl(photo?.value);
  if (fromProfile) {
    if (fromProfile !== asUrl(currentAvatarUrl)) {
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: fromProfile },
      });
    }
    return fromProfile;
  }


  if (photo) {
    if (asUrl(currentAvatarUrl)) {
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });
    }
    await pruneUnusedProfileImages(userId, null);
    return null;
  }

  return asUrl(currentAvatarUrl);
}

export async function maybeSyncAvatarFromAttribute(userId, attribute, value) {
  if (attribute?.name === "Personal Photo" && attribute.type === "IMAGE") {
    return syncPersonalPhotoAvatar(userId, value);
  }
  return null;
}

export async function attachResolvedAvatars(users, options = {}) {
  const list = (users || []).filter(Boolean);
  if (!list.length) return;

  const photos = await prisma.attributeValue.findMany({
    where: {
      userId: { in: list.map((user) => user.id) },
      attribute: { name: "Personal Photo" },
    },
    select: { userId: true, value: true },
  });

  const byUser = new Map(
    photos
      .map((row) => [row.userId, asUrl(row.value)])
      .filter(([, url]) => url)
  );

  const toSync = [];
  for (const user of list) {
    if (byUser.has(user.id)) {
      const profileUrl = byUser.get(user.id);
      if (profileUrl !== asUrl(user.avatarUrl)) {
        user.avatarUrl = profileUrl;
        toSync.push({ id: user.id, avatarUrl: profileUrl });
      }
    } else if (asUrl(user.avatarUrl) && photos.some((row) => row.userId === user.id)) {

      user.avatarUrl = null;
      toSync.push({ id: user.id, avatarUrl: null });
    }
  }

  if (!options.persist || !toSync.length) return;

  await Promise.all(
    toSync.map(({ id, avatarUrl }) =>
      prisma.user.update({ where: { id }, data: { avatarUrl } })
    )
  );
}

export async function upsertPersonalPhotoValue(userId, url) {
  const attribute = await prisma.attribute.findFirst({
    where: { name: "Personal Photo", type: "IMAGE" },
  });
  if (!attribute) {
    await syncPersonalPhotoAvatar(userId, url);
    return url;
  }

  const existing = await prisma.attributeValue.findFirst({
    where: { userId, attributeId: attribute.id },
  });
  if (!existing) {
    await prisma.attributeValue.create({
      data: {
        userId,
        attributeId: attribute.id,
        value: url,
      },
    });
  } else {
    await prisma.attributeValue.update({
      where: { id: existing.id },
      data: { value: url, version: { increment: 1 } },
    });
  }
  await syncPersonalPhotoAvatar(userId, url);
  return url;
}
