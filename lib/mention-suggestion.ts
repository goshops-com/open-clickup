import type { SuggestionOptions } from "@tiptap/suggestion";

export type MentionItem = { id: string; label: string };

/** Lightweight (vanilla DOM) @mention suggestion popup for tiptap. */
export function createMentionSuggestion(
  getItems: () => MentionItem[],
): Omit<SuggestionOptions<MentionItem>, "editor"> {
  return {
    char: "@",
    items: ({ query }) =>
      getItems()
        .filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6),
    render: () => {
      let popup: HTMLDivElement | null = null;
      let items: MentionItem[] = [];
      let selected = 0;
      let command: ((item: MentionItem) => void) | null = null;
      let rect: DOMRect | null = null;

      function paint() {
        if (!popup) return;
        popup.innerHTML = "";
        items.forEach((it, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = it.label;
          b.className = "cu-mention-item" + (i === selected ? " is-active" : "");
          b.onmousedown = (e) => {
            e.preventDefault();
            command?.(it);
          };
          popup!.appendChild(b);
        });
        if (rect) {
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 6}px`;
        }
        popup.style.display = items.length ? "block" : "none";
      }

      return {
        onStart: (props) => {
          items = props.items;
          command = props.command;
          selected = 0;
          rect = props.clientRect?.() ?? null;
          popup = document.createElement("div");
          popup.className = "cu-mention-popup";
          document.body.appendChild(popup);
          paint();
        },
        onUpdate: (props) => {
          items = props.items;
          command = props.command;
          selected = 0;
          rect = props.clientRect?.() ?? null;
          paint();
        },
        onKeyDown: (props) => {
          const n = items.length;
          if (props.event.key === "ArrowDown") {
            selected = n ? (selected + 1) % n : 0;
            paint();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selected = n ? (selected - 1 + n) % n : 0;
            paint();
            return true;
          }
          if (props.event.key === "Enter") {
            if (items[selected]) command?.(items[selected]);
            return true;
          }
          if (props.event.key === "Escape") {
            popup?.remove();
            popup = null;
            return true;
          }
          return false;
        },
        onExit: () => {
          popup?.remove();
          popup = null;
        },
      };
    },
  };
}
