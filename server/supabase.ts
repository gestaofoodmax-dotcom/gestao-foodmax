import { createClient } from "@supabase/supabase-js";

export function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Supabase Environment Check:");
  console.log("SUPABASE_URL exists:", !!url);
  console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!serviceKey);
  console.log(
    "SUPABASE_URL value:",
    url ? `${url.substring(0, 30)}...` : "NOT SET",
  );

  if (!url || !serviceKey) {
    console.error("Missing Supabase environment variables");
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  try {
    const client = createClient(url, serviceKey, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });
    console.log("Supabase client created successfully");
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
