/** Upload image news vers Supabase Storage (API admin). */

export async function uploadNewsImage(file: File): Promise<string> {
  const body = new FormData();
  body.set("file", file);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body,
    credentials: "same-origin",
  });

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    url?: string;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok || !data?.url) {
    const detail = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(`Upload image impossible (${detail})`);
  }

  return data.url;
}
