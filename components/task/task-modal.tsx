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
  Eye,
  Repeat,
  Plus,
  Pencil,
  Trash2,
  Reply,
  Check,
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/api";
import type { TaskDetail } from "@/lib/queries";
import type { TaskPatch } from "@/lib/tasks";
import { Priority } from "@/lib/enums";
import { StatusControl, StatusCircle } from "@/components/menus/status-control";
import { PriorityControl } from "@/components/menus/priority-control";
import { AssigneeControl } from "@/components/menus/assignee-control";
import { DateControl } from "@/components/menus/date-control";
import { RecurrenceControl } from "@/components/menus/recurrence-control";
import { CustomFieldControl } from "@/components/views/custom-field-control";
import { Avatar } from "@/components/ui/avatar";
import { TagControl } from "@/components/menus/tag-control";
import { RichEditor, RichText } from "@/components/ui/rich-editor";
import { Checklists } from "@/components/task/checklists";
import { CommentReactions } from "@/components/task/comment-reactions";
import { TaskMenu } from "@/components/task/save-template";
import { Attachments } from "@/components/task/attachments";
import { TimeTracking } from "@/components/task/time-tracking";
import { Dependencies } from "@/components/task/dependencies";
import { useWorkspace } from "@/components/workspace-context";
import { format } from "date-fns";

export function TaskModal({
  taskId,
  listId,
  onClose,
  onOpenTask,
}: {
  taskId: string;
  listId: string;
  onClose: () => void;
  onOpenTask?: (id: string) => void;
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
                  <TaskMenu taskId={taskId} defaultName={task.name} listId={listId} onOpenTask={onOpenTask} />
                  <button aria-label="Expand" className="rounded p-1.5 text-cu-text-tertiary hover:bg-cu-hover">
                    <Expand className="h-4 w-4" />
                  </button>
                  <Dialog.Close aria-label="Close" className="rounded p-1.5 text-cu-text-tertiary hover:bg-cu-hover">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                {/* main */}
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
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
                        <button
                          key={sub.id}
                          onClick={() => onOpenTask?.(sub.id)}
                          className="flex w-full items-center gap-2 border-b border-cu-border px-3 py-2 text-left last:border-0 hover:bg-cu-hover disabled:cursor-default"
                          disabled={!onOpenTask}
                        >
                          <StatusCircle status={sub.status} size={14} />
                          <span className="text-[13px]">{sub.name}</span>
                          <div className="ml-auto flex -space-x-1.5">
                            {sub.assignees.map((a) => (
                              <Avatar key={a.userId} user={a.user} size="sm" ring />
                            ))}
                          </div>
                        </button>
                      ))}
                      <SubtaskComposer onSubmit={(name) => addSubtask.mutate(name)} />
                    </div>
                  </section>

                  <Checklists taskId={taskId} checklists={task.checklists} onChange={invalidate} />

                  <Attachments taskId={taskId} attachments={task.attachments} onChange={invalidate} />

                  <TimeTracking
                    taskId={taskId}
                    currentUserId={currentUser.id}
                    timeEstimate={task.timeEstimate}
                    entries={task.timeEntries}
                    onChange={invalidate}
                  />

                  <Dependencies
                    taskId={taskId}
                    blockedBy={task.blockedBy}
                    blocking={task.blocking}
                    onChange={invalidate}
                  />

                  {/* activity / comments */}
                  <section className="mt-8">
                    <h3 className="mb-3 text-[13px] font-semibold text-cu-text-secondary">Activity</h3>
                    <ActivityFeed
                      taskId={taskId}
                      comments={task.comments}
                      activities={task.activities}
                      statuses={task.list.statuses}
                      members={workspace.members.map((m) => m.user)}
                      currentUserId={currentUser.id}
                      mentions={mentions}
                      onChange={invalidate}
                    />

                    <CommentComposer
                      user={currentUser}
                      mentions={mentions}
                      onSubmit={(body) => addComment.mutate(body)}
                    />
                  </section>
                </div>

                {/* sidebar */}
                <aside className="w-full shrink-0 overflow-y-auto border-t border-cu-border bg-cu-sidebar/40 p-4 md:w-[320px] md:border-l md:border-t-0">
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

                  <DetailRow icon={<Repeat className="h-4 w-4" />} label="Recurring">
                    <RecurrenceControl
                      value={task.recurrence}
                      onChange={(recurrence) => update.mutate({ recurrence })}
                    />
                  </DetailRow>

                  <DetailRow icon={<TagIcon className="h-4 w-4" />} label="Tags">
                    <TagControl
                      spaceId={task.list.spaceId}
                      selected={task.tags}
                      onChange={(tagIds) => update.mutate({ tagIds })}
                    />
                  </DetailRow>

                  <DetailRow icon={<Eye className="h-4 w-4" />} label="Watchers">
                    <AssigneeControl
                      assignees={task.watchers.map((w) => w.user)}
                      onChange={(ids) => update.mutate({ watcherIds: ids })}
                      size="md"
                      label="Watchers"
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

type ActivityRecord = TaskDetail["activities"][number];

function activityText(
  a: ActivityRecord,
  statusName: (id: string) => string | undefined,
  memberName: (id: string) => string,
): string {
  const d = (a.data ?? {}) as Record<string, unknown>;
  const names = (ids: unknown) => (Array.isArray(ids) ? ids.map((id) => memberName(String(id))).join(", ") : "");
  switch (a.type) {
    case "created":
      return d.fromTemplate ? `created this task from “${String(d.fromTemplate)}”` : "created this task";
    case "status_changed": {
      const name = typeof d.toId === "string" ? statusName(d.toId) : undefined;
      return name ? `set status to ${name}` : "changed the status";
    }
    case "renamed":
      return d.name ? `renamed this task to “${String(d.name)}”` : "renamed this task";
    case "priority_changed":
      return d.priority
        ? `set priority to ${String(d.priority).charAt(0) + String(d.priority).slice(1).toLowerCase()}`
        : "cleared the priority";
    case "due_changed":
      return d.dueDate ? `set the due date to ${format(new Date(String(d.dueDate)), "MMM d")}` : "cleared the due date";
    case "assignee_added":
      return `assigned ${names(d.userIds)}`;
    case "assignee_removed":
      return `unassigned ${names(d.userIds)}`;
    case "attachment_added":
      return d.name ? `attached ${String(d.name)}` : "added an attachment";
    default:
      return a.type.replace(/_/g, " ");
  }
}

function ActivityLine({
  activity,
  statusName,
  memberName,
}: {
  activity: ActivityRecord;
  statusName: (id: string) => string | undefined;
  memberName: (id: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-cu-text-tertiary">
      {activity.user ? (
        <Avatar user={activity.user} size="sm" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-cu-hover-strong" />
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-cu-text-secondary">{activity.user?.name ?? "Someone"}</span>{" "}
        {activityText(activity, statusName, memberName)}
      </span>
      <span className="shrink-0">{format(new Date(activity.createdAt), "MMM d, h:mm a")}</span>
    </div>
  );
}

function ActivityFeed({
  taskId,
  comments,
  activities,
  statuses,
  members,
  currentUserId,
  mentions,
  onChange,
}: {
  taskId: string;
  comments: TaskDetail["comments"];
  activities: ActivityRecord[];
  statuses: { id: string; name: string }[];
  members: { id: string; name: string }[];
  currentUserId: string;
  mentions: { id: string; label: string }[];
  onChange: () => void;
}) {
  const statusName = (id: string) => statuses.find((s) => s.id === id)?.name;
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "someone";

  // group replies under their parent; only top-level comments enter the timeline
  const repliesByParent = new Map<string, TaskDetail["comments"]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }
  const topLevel = comments.filter((c) => !c.parentId);

  // merge top-level comments + non-comment activities into one chronological timeline
  const feed = [
    ...topLevel.map((c) => ({ kind: "comment" as const, at: +new Date(c.createdAt), c })),
    ...activities
      .filter((a) => a.type !== "commented")
      .map((a) => ({ kind: "activity" as const, at: +new Date(a.createdAt), a })),
  ].sort((x, y) => x.at - y.at);

  if (feed.length === 0) {
    return <p className="text-[13px] text-cu-text-tertiary">No activity yet.</p>;
  }

  return (
    <div className="space-y-4">
      {feed.map((item) =>
        item.kind === "comment" ? (
          <CommentItem
            key={`c-${item.c.id}`}
            comment={item.c}
            taskId={taskId}
            replies={repliesByParent.get(item.c.id) ?? []}
            currentUserId={currentUserId}
            mentions={mentions}
            onChange={onChange}
          />
        ) : (
          <ActivityLine key={`a-${item.a.id}`} activity={item.a} statusName={statusName} memberName={memberName} />
        ),
      )}
    </div>
  );
}

function CommentItem({
  comment,
  taskId,
  replies = [],
  currentUserId,
  mentions,
  onChange,
}: {
  comment: TaskDetail["comments"][number];
  taskId?: string;
  replies?: TaskDetail["comments"];
  currentUserId: string;
  mentions: { id: string; label: string }[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [html, setHtml] = useState(comment.body);
  const [replyHtml, setReplyHtml] = useState("");
  const isOwn = comment.user.id === currentUserId;

  const save = useMutation({
    mutationFn: (body: string) => apiSend(`/api/comments/${comment.id}`, "PATCH", { body }),
    onSuccess: () => {
      setEditing(false);
      onChange();
    },
  });
  const del = useMutation({
    mutationFn: () => apiSend(`/api/comments/${comment.id}`, "DELETE"),
    onSuccess: onChange,
  });
  const reply = useMutation({
    mutationFn: (body: string) => apiSend(`/api/tasks/${taskId}/comments`, "POST", { body, parentId: comment.id }),
    onSuccess: () => {
      setReplying(false);
      setReplyHtml("");
      onChange();
    },
  });
  const resolve = useMutation({
    mutationFn: (resolved: boolean) => apiSend(`/api/comments/${comment.id}`, "PATCH", { resolved }),
    onSuccess: onChange,
  });

  return (
    <div className={`group flex gap-2.5 ${comment.resolved ? "opacity-60" : ""}`}>
      <Avatar user={comment.user} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{comment.user.name}</span>
          <span className="text-[11px] text-cu-text-tertiary">
            {format(new Date(comment.createdAt), "MMM d, h:mm a")}
          </span>
          {comment.resolved && (
            <span className="flex items-center gap-0.5 rounded-full bg-[#6bc950]/20 px-1.5 py-px text-[10px] font-semibold text-[#6bc950]">
              <Check className="h-3 w-3" /> Resolved
            </span>
          )}
          {isOwn && !editing && (
            <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => {
                  setHtml(comment.body);
                  setEditing(true);
                }}
                aria-label="Edit comment"
                className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => del.mutate()}
                aria-label="Delete comment"
                className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-1">
            <RichEditor content={comment.body} mentions={mentions} onChange={setHtml} />
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={() => html && html !== "<p></p>" && save.mutate(html)}
                className="rounded bg-cu-purple px-2.5 py-1 text-[12px] font-medium text-white hover:bg-cu-purple-dark"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded px-2.5 py-1 text-[12px] text-cu-text-secondary hover:bg-cu-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <RichText html={comment.body} className="mt-0.5" />
            <div className="flex items-center gap-2">
              <CommentReactions
                commentId={comment.id}
                reactions={comment.reactions}
                currentUserId={currentUserId}
                onChange={onChange}
              />
              {taskId && (
                <button
                  onClick={() => setReplying((r) => !r)}
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-cu-text-tertiary hover:text-cu-purple"
                >
                  <Reply className="h-3 w-3" /> Reply
                </button>
              )}
              {taskId && (
                <button
                  onClick={() => resolve.mutate(!comment.resolved)}
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-cu-text-tertiary hover:text-[#6bc950]"
                >
                  <Check className="h-3 w-3" /> {comment.resolved ? "Reopen" : "Resolve"}
                </button>
              )}
            </div>

            {replies.length > 0 && (
              <div className="mt-2 space-y-3 border-l-2 border-cu-border pl-3">
                {replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    comment={r}
                    currentUserId={currentUserId}
                    mentions={mentions}
                    onChange={onChange}
                  />
                ))}
              </div>
            )}

            {replying && taskId && (
              <div className="mt-2 border-l-2 border-cu-border pl-3">
                <RichEditor content="" placeholder="Write a reply…" mentions={mentions} onChange={setReplyHtml} />
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => replyHtml && replyHtml !== "<p></p>" && reply.mutate(replyHtml)}
                    disabled={reply.isPending}
                    className="rounded bg-cu-purple px-2.5 py-1 text-[12px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-40"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => setReplying(false)}
                    className="rounded px-2.5 py-1 text-[12px] text-cu-text-secondary hover:bg-cu-hover"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
