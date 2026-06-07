"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Expand,
  TextAlignStart,
  SquareCheckBig,
  Calendar as CalendarIcon,
  Flag,
  Tag as TagIcon,
  Plus,
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/api";
import type { TaskDetail } from "@/lib/queries";
import type { TaskPatch } from "@/lib/tasks";
import { Priority } from "@/lib/enums";
import { StatusControl, StatusCircle } from "@/components/menus/status-control";
import { PriorityControl } from "@/components/menus/priority-control";
import { AssigneeControl } from "@/components/menus/assignee-control";
import { DateControl } from "@/components/menus/date-control";
import { CustomFieldControl } from "@/components/views/custom-field-control";
import { Avatar } from "@/components/ui/avatar";
import { TagControl } from "@/components/menus/tag-control";
import { RichEditor, RichText } from "@/components/ui/rich-editor";
import { Checklists } from "@/components/task/checklists";
import { useWorkspace } from "@/components/workspace-context";
import { format } from "date-fns";

export function TaskModal({
  taskId,
  listId,
  onClose,
}: {
  taskId: string;
  listId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { currentUser, workspace } = useWorkspace();
  const mentions = workspace.members.map((m) => ({ id: m.user.id, label: m.user.name }));
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => apiGet<TaskDetail>(`/api/tasks/${taskId}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["task", taskId] });
    qc.invalidateQueries({ queryKey: ["list", listId] });
  };

  const update = useMutation({
    mutationFn: (patch: TaskPatch) => apiSend<TaskDetail>(`/api/tasks/${taskId}`, "PATCH", patch),
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: (body: string) => apiSend(`/api/tasks/${taskId}/comments`, "POST", { body }),
    onSuccess: invalidate,
  });

  const addSubtask = useMutation({
    mutationFn: (name: string) =>
      apiSend("/api/tasks", "POST", { listId, name, parentId: taskId }),
    onSuccess: invalidate,
  });

  const setField = useMutation({
    mutationFn: (v: { fieldId: string; value: unknown }) =>
      apiSend(`/api/tasks/${taskId}/fields/${v.fieldId}`, "PUT", { value: v.value }),
    onSuccess: invalidate,
  });

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[min(1080px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-cu-panel shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Task details</Dialog.Title>

          {isLoading || !task ? (
            <div className="flex flex-1 items-center justify-center text-sm text-cu-text-secondary">
              Loading…
            </div>
          ) : (
            <>
              {/* header */}
              <div className="flex items-center gap-2 border-b border-cu-border px-4 py-2.5">
                <StatusControl
                  current={task.status}
                  statuses={task.list.statuses}
                  variant="badge"
                  onChange={(statusId) => update.mutate({ statusId })}
                />
                <span className="text-[13px] text-cu-text-tertiary">in {task.list.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button className="rounded p-1.5 text-cu-text-tertiary hover:bg-cu-hover">
                    <Expand className="h-4 w-4" />
                  </button>
                  <Dialog.Close className="rounded p-1.5 text-cu-text-tertiary hover:bg-cu-hover">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
              </div>

              <div className="flex min-h-0 flex-1">
                {/* main */}
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
                  <TitleField
                    value={task.name}
                    onSave={(name) => update.mutate({ name })}
                  />

                  <div className="mt-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-cu-text-secondary">
                      <TextAlignStart className="h-4 w-4" /> Description
                    </div>
                    <RichEditor
                      content={task.description ?? ""}
                      placeholder="Add a description…"
                      mentions={mentions}
                      onBlur={(description) => update.mutate({ description })}
                    />
                  </div>

                  {/* subtasks */}
                  <section className="mt-6">
                    <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary">
                      <SquareCheckBig className="h-4 w-4" /> Subtasks
                      {task.subtasks.length > 0 && (
                        <span className="text-cu-text-tertiary">{task.subtasks.length}</span>
                      )}
                    </h3>
                    <div className="rounded-lg border border-cu-border">
                      {task.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 border-b border-cu-border px-3 py-2 last:border-0"
                        >
                          <StatusCircle status={sub.status} size={14} />
                          <span className="text-[13px]">{sub.name}</span>
                          <div className="ml-auto flex -space-x-1.5">
                            {sub.assignees.map((a) => (
                              <Avatar key={a.userId} user={a.user} size="sm" ring />
                            ))}
                          </div>
                        </div>
                      ))}
                      <SubtaskComposer onSubmit={(name) => addSubtask.mutate(name)} />
                    </div>
                  </section>

                  <Checklists taskId={taskId} checklists={task.checklists} onChange={invalidate} />

                  {/* activity / comments */}
                  <section className="mt-8">
                    <h3 className="mb-3 text-[13px] font-semibold text-cu-text-secondary">Activity</h3>
                    <div className="space-y-4">
                      {task.comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                          <Avatar user={c.user} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[13px] font-semibold">{c.user.name}</span>
                              <span className="text-[11px] text-cu-text-tertiary">
                                {format(new Date(c.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <RichText html={c.body} className="mt-0.5" />
                          </div>
                        </div>
                      ))}
                      {task.comments.length === 0 && (
                        <p className="text-[13px] text-cu-text-tertiary">No comments yet.</p>
                      )}
                    </div>

                    <CommentComposer
                      user={currentUser}
                      mentions={mentions}
                      onSubmit={(body) => addComment.mutate(body)}
                    />
                  </section>
                </div>

                {/* sidebar */}
                <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-cu-border bg-cu-sidebar/40 p-4">
                  <DetailRow icon={<UserGlyph />} label="Assignees">
                    <AssigneeControl
                      assignees={task.assignees.map((a) => a.user)}
                      onChange={(ids) => update.mutate({ assigneeIds: ids })}
                      size="md"
                    />
                  </DetailRow>

                  <DetailRow icon={<CalendarIcon className="h-4 w-4" />} label="Due date">
                    <DateControl
                      value={task.dueDate}
                      done={task.status.type === "DONE"}
                      onChange={(d) => update.mutate({ dueDate: d ? d.toISOString() : null })}
                    />
                  </DetailRow>

                  <DetailRow icon={<CalendarIcon className="h-4 w-4" />} label="Start date">
                    <DateControl
                      value={task.startDate}
                      onChange={(d) => update.mutate({ startDate: d ? d.toISOString() : null })}
                    />
                  </DetailRow>

                  <DetailRow icon={<Flag className="h-4 w-4" />} label="Priority">
                    <PriorityControl
                      value={task.priority}
                      onChange={(p: Priority | null) => update.mutate({ priority: p })}
                    />
                  </DetailRow>

                  <DetailRow icon={<TagIcon className="h-4 w-4" />} label="Tags">
                    <TagControl
                      spaceId={task.list.spaceId}
                      selected={task.tags}
                      onChange={(tagIds) => update.mutate({ tagIds })}
                    />
                  </DetailRow>

                  {/* custom fields */}
                  {task.list.customFields.length > 0 && (
                    <div className="mt-4 border-t border-cu-border pt-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                        Custom Fields
                      </div>
                      {task.list.customFields.map((f) => (
                        <DetailRow key={f.id} icon={<Plus className="h-4 w-4 opacity-0" />} label={f.name}>
                          <CustomFieldControl
                            field={f}
                            value={task.customFieldValues.find((cv) => cv.customFieldId === f.id)?.value}
                            onChange={(value) => setField.mutate({ fieldId: f.id, value })}
                          />
                        </DetailRow>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 border-t border-cu-border pt-4 text-[11px] text-cu-text-tertiary">
                    {task.createdBy && <div>Created by {task.createdBy.name}</div>}
                    <div>{format(new Date(task.createdAt), "MMM d, yyyy")}</div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TitleField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v.trim())}
      rows={1}
      className="w-full resize-none text-2xl font-semibold text-cu-text outline-none placeholder:text-cu-text-tertiary"
      placeholder="Task name"
    />
  );
}

function SubtaskComposer({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Plus className="h-4 w-4 text-cu-text-tertiary" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onSubmit(v.trim());
            setV("");
          }
        }}
        placeholder="Add a subtask"
        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
      />
    </div>
  );
}

function CommentComposer({
  user,
  mentions,
  onSubmit,
}: {
  user: { name: string; color: string; avatarUrl: string | null };
  mentions: { id: string; label: string }[];
  onSubmit: (body: string) => void;
}) {
  const [html, setHtml] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const empty = !html || html === "<p></p>";
  function submit() {
    if (empty) return;
    onSubmit(html);
    setHtml("");
    setResetKey((k) => k + 1);
  }
  return (
    <div className="mt-4 flex gap-2.5">
      <Avatar user={user} size="lg" />
      <div className="flex-1">
        <RichEditor key={resetKey} content="" placeholder="Write a comment…" mentions={mentions} onChange={setHtml} />
        <div className="mt-1.5 flex justify-end">
          <button
            onClick={submit}
            disabled={empty}
            className="rounded bg-cu-purple px-3 py-1 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex w-28 shrink-0 items-center gap-1.5 text-[13px] text-cu-text-tertiary">
        {icon}
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
    </svg>
  );
}
