import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Unauthenticated liveness/readiness probe for load balancers, uptime
// monitors, and container healthchecks. Returns 200 when the DB is reachable,
// 503 otherwise.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: true });
  } catch {
    return NextResponse.json({ status: "error", db: false }, { status: 503 });
  }
}
