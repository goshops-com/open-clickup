"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  House,
  LayoutGrid,
  Ellipsis,
  Folder as FolderIcon,
  FolderOpen,
  List as ListIcon,
  Settings,
  Bell,
  PanelLeftClose,
  Trash2,
  Pencil,
  FolderPlus,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiSend } from "@/lib/api";
import { useWorkspace } from "@/components/workspace-context";
import { useHierarchy } from "@/lib/hooks";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { InboxButton } from "@/components/sidebar/inbox";
import { ProfileDialog } from "@/components/profile-dialog";
import type { SpaceNode, FolderNode, ListNode } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";

export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  const { workspace } = useWorkspace();
  const { createSpace } = useHierarchy();
  const [creatingSpace, setCreatingSpace] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[var(--sidebar-w,260px)] shrink-0 flex-col border-r border-cu-border bg-cu-sidebar text-cu-text">
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-cu-hover-strong">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: workspace.color }}
          >
            {workspace.name[0]}
          </span>
          <span className="truncate text-sm font-semibold">{workspace.name}</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-cu-text-tertiary" />
        </button>
        <button
          onClick={onCollapse}
          className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover-strong hover:text-cu-text"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="flex w-full items-center gap-2 rounded-md border border-cu-border bg-cu-panel px-2.5 py-1.5 text-[13px] text-cu-text-tertiary hover:border-cu-border-strong"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-auto rounded bg-cu-hover px-1.5 py-0.5 text-[10px] text-cu-text-tertiary">⌘K</kbd>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-2">
        <NavItem
          icon={<House className="h-4 w-4" />}
          label="Home"
          active={pathname === "/home"}
          onClick={() => router.push("/home")}
        />
        <InboxButton />
        <NavItem icon={<LayoutGrid className="h-4 w-4" />} label="Dashboards" />
      </nav>

      <div className="mx-3 my-2 border-t border-cu-border" />

      {/* Spaces */}
      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Spaces</span>
        <button
          onClick={() => setCreatingSpace(true)}
          className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover-strong hover:text-cu-text"
          title="New Space"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {workspace.spaces.map((space) => (
          <SpaceItem key={space.id} space={space} />
        ))}
        {creatingSpace && (
          <InlineInput
            depth={0}
            placeholder="Space name"
            onSubmit={(name) => {
              createSpace.mutate(name);
              setCreatingSpace(false);
            }}
            onCancel={() => setCreatingSpace(false)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-cu-border px-3 py-2">
        <UserSwitcher />
        <div className="ml-auto flex items-center gap-0.5">
          <ThemeToggle />
          <button className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover-strong hover:text-cu-text">
            <Bell className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover-strong hover:text-cu-text">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  badge,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-cu-text hover:bg-cu-hover-strong",
        active && "bg-cu-sidebar-active font-medium",
      )}
    >
      <span className="text-cu-text-secondary">{icon}</span>
      <span>{label}</span>
      {badge != null && (
        <span className="ml-auto rounded-full bg-cu-purple px-1.5 py-px text-[10px] font-semibold text-white">{badge}</span>
      )}
    </button>
  );
}

function UserSwitcher() {
  const { workspace, currentUser } = useWorkspace();
  const qc = useQueryClient();
  const members = workspace.members.map((m) => m.user);
  const [profileOpen, setProfileOpen] = useState(false);

  async function switchTo(userId: string) {
    if (userId === currentUser.id) return;
    await apiSend("/api/me", "POST", { userId });
    qc.invalidateQueries();
  }

  async function logout() {
    await apiSend("/api/auth/logout", "POST");
    window.location.href = "/login";
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 hover:bg-cu-hover-strong">
          <Avatar user={currentUser} size="md" />
          <span className="truncate text-[13px] font-medium">{currentUser.name}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
            Switch user
          </div>
          {members.map((u) => (
            <DropdownMenu.Item
              key={u.id}
              onSelect={() => switchTo(u.id)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
            >
              <Avatar user={u} size="md" />
              <span className="flex-1 truncate">{u.name}</span>
              {u.id === currentUser.id && <span className="text-[11px] text-cu-purple">current</span>}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-cu-border" />
          <DropdownMenu.Item
            onSelect={() => setProfileOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
          >
            <Settings className="h-4 w-4" /> Edit profile
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={logout}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-cu-text-secondary outline-none hover:bg-cu-hover focus:bg-cu-hover"
          >
            <LogOut className="h-4 w-4" /> Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </DropdownMenu.Root>
  );
}

function SpaceItem({ space }: { space: SpaceNode }) {
  const router = useRouter();
  const { createList, createFolder, rename, remove } = useHierarchy();
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState<"list" | "folder" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const hasChildren = space.folders.length > 0 || space.lists.length > 0;

  if (renaming) {
    return (
      <InlineInput
        depth={0}
        initial={space.name}
        leading={
          <span className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white" style={{ backgroundColor: space.color }}>
            {space.icon ?? space.name[0]}
          </span>
        }
        onSubmit={(name) => {
          rename.mutate({ kind: "spaces", id: space.id, name });
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  return (
    <div className="select-none">
      <Row
        depth={0}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        hasChildren={hasChildren}
        leading={
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white" style={{ backgroundColor: space.color }}>
            {space.icon ?? space.name[0]}
          </span>
        }
        label={space.name}
        bold
        onRename={() => setRenaming(true)}
        onDelete={() => remove.mutate({ kind: "spaces", id: space.id })}
        addMenu={
          <>
            <MenuItem icon={<ListIcon className="h-4 w-4" />} label="New List" onSelect={() => { setOpen(true); setCreating("list"); }} />
            <MenuItem icon={<FolderPlus className="h-4 w-4" />} label="New Folder" onSelect={() => { setOpen(true); setCreating("folder"); }} />
          </>
        }
      />
      {open && (
        <div>
          {space.folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
          {space.lists.map((list) => (
            <ListItemRow key={list.id} list={list} depth={1} />
          ))}
          {creating === "list" && (
            <InlineInput
              depth={1}
              placeholder="List name"
              leading={<ListIcon className="h-4 w-4 text-cu-text-secondary" />}
              onSubmit={async (name) => {
                const l = await createList.mutateAsync({ spaceId: space.id, name });
                setCreating(null);
                router.push(`/l/${l.id}`);
              }}
              onCancel={() => setCreating(null)}
            />
          )}
          {creating === "folder" && (
            <InlineInput
              depth={1}
              placeholder="Folder name"
              leading={<FolderIcon className="h-4 w-4 text-cu-text-secondary" />}
              onSubmit={(name) => {
                createFolder.mutate({ spaceId: space.id, name });
                setCreating(null);
              }}
              onCancel={() => setCreating(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FolderItem({ folder }: { folder: FolderNode }) {
  const router = useRouter();
  const { createList, rename, remove } = useHierarchy();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);

  if (renaming) {
    return (
      <InlineInput
        depth={1}
        initial={folder.name}
        leading={<FolderIcon className="h-4 w-4 text-cu-text-secondary" />}
        onSubmit={(name) => {
          rename.mutate({ kind: "folders", id: folder.id, name });
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  return (
    <div>
      <Row
        depth={1}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        hasChildren={folder.lists.length > 0}
        leading={open ? <FolderOpen className="h-4 w-4 text-cu-text-secondary" /> : <FolderIcon className="h-4 w-4 text-cu-text-secondary" />}
        label={folder.name}
        onRename={() => setRenaming(true)}
        onDelete={() => remove.mutate({ kind: "folders", id: folder.id })}
        onAdd={() => { setOpen(true); setCreating(true); }}
      />
      {open && (
        <>
          {folder.lists.map((list) => (
            <ListItemRow key={list.id} list={list} depth={2} />
          ))}
          {creating && (
            <InlineInput
              depth={2}
              placeholder="List name"
              leading={<ListIcon className="h-4 w-4 text-cu-text-secondary" />}
              onSubmit={async (name) => {
                const l = await createList.mutateAsync({ spaceId: folder.spaceId, folderId: folder.id, name });
                setCreating(false);
                router.push(`/l/${l.id}`);
              }}
              onCancel={() => setCreating(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

function ListItemRow({ list, depth }: { list: ListNode & { spaceId?: string }; depth: number }) {
  const params = useParams();
  const router = useRouter();
  const { rename, remove } = useHierarchy();
  const [renaming, setRenaming] = useState(false);
  const active = params?.listId === list.id;

  if (renaming) {
    return (
      <InlineInput
        depth={depth}
        initial={list.name}
        leading={<ListIcon className="h-4 w-4 text-cu-text-secondary" />}
        onSubmit={(name) => {
          rename.mutate({ kind: "lists", id: list.id, name });
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  return (
    <Link
      href={`/l/${list.id}`}
      onDoubleClick={(e) => { e.preventDefault(); setRenaming(true); }}
      className={cn(
        "group flex items-center gap-2 rounded-md py-1.5 pr-2 text-[13px]",
        active ? "bg-cu-sidebar-active font-medium text-cu-purple-dark" : "text-cu-text hover:bg-cu-hover-strong",
      )}
      style={{ paddingLeft: depth * 14 + 8 }}
    >
      <ListIcon
        className={cn("h-4 w-4 shrink-0", active ? "text-cu-purple" : "text-cu-text-secondary")}
        style={list.color && !active ? { color: list.color } : undefined}
      />
      <span className="truncate">{list.name}</span>
      <span className="ml-auto flex items-center gap-1">
        <span className="hidden text-[11px] text-cu-text-tertiary group-hover:inline">{list._count.tasks}</span>
        <RowMenu
          onRename={() => setRenaming(true)}
          onDelete={() => {
            if (active) router.push("/");
            remove.mutate({ kind: "lists", id: list.id });
          }}
        />
      </span>
    </Link>
  );
}

function Row({
  depth,
  open,
  onToggle,
  hasChildren,
  leading,
  label,
  bold,
  onRename,
  onDelete,
  onAdd,
  addMenu,
}: {
  depth: number;
  open: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  leading: React.ReactNode;
  label: string;
  bold?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
  addMenu?: React.ReactNode;
}) {
  return (
    <div
      className="group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-[13px] text-cu-text hover:bg-cu-hover-strong"
      style={{ paddingLeft: depth * 14 + 4 }}
    >
      <button onClick={onToggle} className="flex h-4 w-4 items-center justify-center text-cu-text-tertiary">
        {hasChildren ? (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
      </button>
      <button onClick={onToggle} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-center gap-1.5">
        {leading}
        <span className={cn("truncate", bold && "font-semibold")}>{label}</span>
      </button>
      {(onRename || onDelete) && <RowMenu onRename={onRename} onDelete={onDelete} />}
      {addMenu ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="hidden rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover group-hover:block" title="Add">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content sideOffset={4} align="end" className="z-50 min-w-[160px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg">
              {addMenu}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : onAdd ? (
        <button onClick={onAdd} className="hidden rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover group-hover:block" title="New List">
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function RowMenu({ onRename, onDelete }: { onRename?: () => void; onDelete?: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="hidden rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover group-hover:block"
        >
          <Ellipsis className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={4} align="end" className="z-50 min-w-[150px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg">
          {onRename && <MenuItem icon={<Pencil className="h-4 w-4" />} label="Rename" onSelect={onRename} />}
          {onDelete && <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete" onSelect={onDelete} danger />}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({
  icon,
  label,
  onSelect,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover",
        danger && "text-cu-urgent",
      )}
    >
      {icon}
      {label}
    </DropdownMenu.Item>
  );
}

function InlineInput({
  depth,
  placeholder,
  initial,
  leading,
  onSubmit,
  onCancel,
}: {
  depth: number;
  placeholder?: string;
  initial?: string;
  leading?: React.ReactNode;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial ?? "");
  return (
    <div className="flex items-center gap-1.5 rounded-md py-1 pr-2" style={{ paddingLeft: depth * 14 + 22 }}>
      {leading}
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) onSubmit(v.trim());
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => (v.trim() ? onSubmit(v.trim()) : onCancel())}
        placeholder={placeholder}
        className="w-full rounded border border-cu-purple bg-cu-panel px-1.5 py-0.5 text-[13px] outline-none"
      />
    </div>
  );
}
