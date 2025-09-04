import { createClient } from "@supabase/supabase-js";

export function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!(globalThis as any).__SUPABASE_ENV_LOGGED__) {
    (globalThis as any).__SUPABASE_ENV_LOGGED__ = true;
    const maskedUrl = url ? `${url.substring(0, 30)}...` : "NOT SET";
    console.log("Supabase env ok:", {
      hasUrl: !!url,
      hasKey: !!serviceKey,
      url: maskedUrl,
    });
  }

  if (!url || !serviceKey) {
    console.error("Missing Supabase environment variables");
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  try {
    const client = createClient(url, serviceKey, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });
    return client;
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    throw error;
  }
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
