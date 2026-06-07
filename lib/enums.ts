// Client-safe enum values & types. Re-exports the standalone generated enums
// module (plain const objects, no Prisma runtime) so client components can use
// enum values without bundling the Prisma client.
export * from "@/lib/generated/prisma/enums";
