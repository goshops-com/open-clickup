"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import type { ListData, TaskWithRelations, UserLite, WorkspaceTree } from "@/lib/queries";
import type { TaskPatch } from "@/lib/tasks";

export type Bootstrap = { currentUser: UserLite; workspace: WorkspaceTree };

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/** Subscribe to the SSE stream and invalidate caches so collaborators' changes appear live. */
export function useRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; listId?: string };
        if (event.type === "list" && event.listId) {
          qc.invalidateQueries({ queryKey: ["list", event.listId] });
          qc.invalidateQueries({ queryKey: ["task"] });
        } else if (event.type === "bootstrap") {
          qc.invalidateQueries({ queryKey: ["bootstrap"] });
        }
      } catch {
        /* ignore malformed event */
      }
    };
    return () => es.close();
  }, [qc]);
}

export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => apiGet<Bootstrap>("/api/bootstrap"),
    staleTime: 5 * 60_000,
  });
}

export function useList(listId: string | undefined) {
  return useQuery({
    queryKey: ["list", listId],
    queryFn: () => apiGet<ListData>(`/api/lists/${listId}`),
    enabled: !!listId,
  });
}

// ----------------------------------------------------------------------------
// Hierarchy CRUD (spaces / folders / lists) — all refresh the sidebar tree
// ----------------------------------------------------------------------------

type ListLite = { id: string; name: string; spaceId: string };

export function useHierarchy() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["bootstrap"] });

  const createSpace = useMutation({
    mutationFn: (name: string) => apiSend<{ id: string }>("/api/spaces", "POST", { name }),
    onSuccess: refresh,
  });
  const createFolder = useMutation({
    mutationFn: (v: { spaceId: string; name: string }) =>
      apiSend<{ id: string }>("/api/folders", "POST", v),
    onSuccess: refresh,
  });
  const createList = useMutation({
    mutationFn: (v: { spaceId: string; folderId?: string | null; name: string }) =>
      apiSend<ListLite>("/api/lists", "POST", v),
    onSuccess: refresh,
  });
  const rename = useMutation({
    mutationFn: (v: { kind: "spaces" | "folders" | "lists"; id: string; name: string }) =>
      apiSend(`/api/${v.kind}/${v.id}`, "PATCH", { name: v.name }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (v: { kind: "spaces" | "folders" | "lists"; id: string }) =>
      apiSend(`/api/${v.kind}/${v.id}`, "DELETE"),
    onSuccess: refresh,
  });

  return { createSpace, createFolder, createList, rename, remove };
}

export type TagModel = { id: string; spaceId: string; name: string; color: string };

export function useTags(spaceId: string | undefined) {
  return useQuery({
    queryKey: ["tags", spaceId],
    queryFn: () => apiGet<TagModel[]>(`/api/spaces/${spaceId}/tags`),
    enabled: !!spaceId,
  });
}

export function useCreateTag(spaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiSend<TagModel>(`/api/spaces/${spaceId}/tags`, "POST", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", spaceId] }),
  });
}

// ----------------------------------------------------------------------------
// Mutations (optimistic where it matters for UX feel)
// ----------------------------------------------------------------------------

export function useUpdateTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: TaskPatch }) =>
      apiSend<TaskWithRelations>(`/api/tasks/${taskId}`, "PATCH", patch),
    onMutate: async ({ taskId, patch }) => {
      if (!listId) return;
      await qc.cancelQueries({ queryKey: ["list", listId] });
      const prev = qc.getQueryData<ListData>(["list", listId]);
      if (prev) {
        qc.setQueryData<ListData>(["list", listId], {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? applyOptimistic(t, patch) : t,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && listId) qc.setQueryData(["list", listId], ctx.prev);
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useCreateTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listId: string;
      name: string;
      statusId?: string;
      parentId?: string | null;
      priority?: string | null;
      assigneeIds?: string[];
    }) => apiSend<TaskWithRelations>("/api/tasks", "POST", input),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useBulk(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      ids: string[];
      patch?: { statusId?: string; priority?: string | null; assigneeIds?: string[] };
      delete?: boolean;
    }) => apiSend("/api/tasks/bulk", "POST", input),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useSetFieldValue(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { taskId: string; fieldId: string; value: unknown }) =>
      apiSend(`/api/tasks/${v.taskId}/fields/${v.fieldId}`, "PUT", { value: v.value }),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useDeleteTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiSend<{ ok: true }>(`/api/tasks/${taskId}`, "DELETE"),
    onMutate: async (taskId) => {
      if (!listId) return;
      await qc.cancelQueries({ queryKey: ["list", listId] });
      const prev = qc.getQueryData<ListData>(["list", listId]);
      if (prev) {
        qc.setQueryData<ListData>(["list", listId], {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && listId) qc.setQueryData(["list", listId], ctx.prev);
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

function applyOptimistic(task: TaskWithRelations, patch: TaskPatch): TaskWithRelations {
  return {
    ...task,
    name: patch.name ?? task.name,
    description: patch.description !== undefined ? patch.description : task.description,
    priority: patch.priority !== undefined ? (patch.priority as TaskWithRelations["priority"]) : task.priority,
    statusId: patch.statusId ?? task.statusId,
    position: patch.position ?? task.position,
    startDate: patch.startDate !== undefined ? (patch.startDate ? new Date(patch.startDate) : null) : task.startDate,
    dueDate: patch.dueDate !== undefined ? (patch.dueDate ? new Date(patch.dueDate) : null) : task.dueDate,
  };
}
