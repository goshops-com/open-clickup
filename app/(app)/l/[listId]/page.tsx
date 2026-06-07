"use client";

import { use } from "react";
import { ListPage } from "@/components/views/list-page";

export default function ListRoute({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  return <ListPage listId={listId} />;
}
