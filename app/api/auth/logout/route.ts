import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { route } from "@/lib/api-helpers";

export const POST = route(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
