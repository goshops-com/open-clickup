"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Heading2,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createMentionSuggestion, type MentionItem } from "@/lib/mention-suggestion";

export function RichEditor({
  content,
  onChange,
  onBlur,
  placeholder,
  className,
  toolbar = true,
  autoFocus = false,
  mentions,
}: {
  content: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  className?: string;
  toolbar?: boolean;
  autoFocus?: boolean;
  mentions?: MentionItem[];
}) {
  // ref so the mention suggestion (created once) always reads the latest list;
  // synced in an effect — the suggestion only reads it when the user types "@".
  const mentionsRef = useRef<MentionItem[]>(mentions ?? []);
  useEffect(() => {
    mentionsRef.current = mentions ?? [];
  }, [mentions]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      ...(mentions
        ? [
            Mention.configure({
              HTMLAttributes: { class: "mention" },
              suggestion: createMentionSuggestion(() => mentionsRef.current),
            }),
          ]
        : []),
    ],
    content,
    immediatelyRender: false,
    autofocus: autoFocus,
    editorProps: {
      attributes: { class: cn("rich min-h-[60px] px-3 py-2 outline-none", className) },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    onBlur: ({ editor }) => onBlur?.(editor.getHTML()),
  });

  // keep external content in sync when switching tasks
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return <div className="min-h-[60px] px-3 py-2 text-[13px] text-cu-text-tertiary">…</div>;

  return (
    <div className="rounded-lg border border-cu-border focus-within:border-cu-purple">
      {toolbar && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    cn(
      "flex h-7 w-7 items-center justify-center rounded hover:bg-cu-hover",
      active ? "bg-cu-purple-light text-cu-purple-dark" : "text-cu-text-secondary",
    );
  return (
    <div className="flex items-center gap-0.5 border-b border-cu-border px-1.5 py-1">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))}>
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-cu-border" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
        <Quote className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive("codeBlock"))}>
        <Code className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Static renderer for stored HTML. */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn("rich", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
