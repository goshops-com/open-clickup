"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Index() {
  const router = useRouter();
  // Home ("My Work") is the default landing, mirroring ClickUp.
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  return <div className="flex h-full items-center justify-center text-sm text-cu-text-secondary">Opening…</div>;
}
