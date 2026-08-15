import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getElevatedAdmin } from "@/lib/admin/access";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const NEWS_IMAGES_BUCKET = "news-images";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionFor(mime: string, fileName: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function POST(request: Request) {
  const admin = await getElevatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported_type", allowed: [...ALLOWED_TYPES] },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES },
      { status: 400 },
    );
  }

  const ext = extensionFor(file.type, file.name);
  const path = `${admin.userId}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from(NEWS_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    console.error("news image upload failed:", error.message);
    return NextResponse.json(
      { error: "upload_failed", message: error.message },
      { status: 500 },
    );
  }

  const publicUrl = `${getSupabaseUrl()}/storage/v1/object/public/${NEWS_IMAGES_BUCKET}/${path}`;

  return NextResponse.json({ ok: true, url: publicUrl, path });
}
