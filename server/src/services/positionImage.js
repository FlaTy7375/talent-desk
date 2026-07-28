import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { POSITION_INCLUDE, toDto } from "./positionDto.js";

export const POSITION_IMAGE_BUCKET = "position-images";

export async function ensurePositionImageBucket() {
  if (!supabaseAdmin) {
    const err = new Error("Storage is not configured");
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }
  const existing = await supabaseAdmin.storage.getBucket(POSITION_IMAGE_BUCKET);
  if (!existing.error) return;
  const created = await supabaseAdmin.storage.createBucket(POSITION_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
    throw created.error;
  }
}

export async function uploadPositionImage(positionId, file) {
  await ensurePositionImageBucket();
  const extension = file.mimetype.split("/")[1].replace("jpeg", "jpg");
  const path = `${positionId}/${randomUUID()}.${extension}`;
  const uploaded = await supabaseAdmin.storage
    .from(POSITION_IMAGE_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploaded.error) throw uploaded.error;

  const { data } = supabaseAdmin.storage.from(POSITION_IMAGE_BUCKET).getPublicUrl(path);
  const updated = await prisma.position.update({
    where: { id: positionId },
    data: { imageUrl: data.publicUrl, version: { increment: 1 } },
    include: POSITION_INCLUDE,
  });
  return { url: data.publicUrl, position: toDto(updated) };
}
