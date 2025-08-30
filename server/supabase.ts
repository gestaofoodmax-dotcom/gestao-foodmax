import { createClient } from "@supabase/supabase-js";

export function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    db: { schema: "public" },
  });
}

export function getClientIp(req: any) {
  const xf = (req.headers["x-forwarded-for"] || "") as string;
  const forwarded = xf?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.socket?.remoteAddress ||
    req.ip ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}
