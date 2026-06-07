import { NextResponse } from "next/server";
import { ZodType } from "zod";

/** Throw to short-circuit a route handler with a specific HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Parse + validate a JSON request body against a zod schema. Throws ApiError(400) on failure. */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    throw new ApiError(400, msg);
  }
  return parsed.data;
}

/** Normalize any thrown value into a JSON error response. */
export function handleError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  // Prisma "record not found" → 404
  const code = (e as { code?: string })?.code;
  if (code === "P2025") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Wrap a route handler so thrown errors become consistent JSON responses. */
export function route<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<NextResponse>,
): (req: Request, ctx: Ctx) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return handleError(e);
    }
  };
}
