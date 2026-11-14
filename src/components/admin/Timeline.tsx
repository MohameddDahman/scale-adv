"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Lightning, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { relativeTime } from "./format";
import { errorMessage, useAdminMutation, useSession } from "./session";
import { Avatar, Button, IconButton, Textarea, useFeedback } from "./ui";

/** Notes and automatic events for a lead or application, newest first. */
export function Timeline({ entity, entityId, notes }: { entity: "lead" | "application"; entityId: string; notes: Doc<"notes">[] }) {
  const add = useAdminMutation(api.notes.add);
  const remove = useAdminMutation(api.notes.remove);
  const { me } = useSession();
  const { toast, confirm } = useFeedback();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const sorted = [...notes].sort((a, b) => b._creationTime - a._creationTime);

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setBusy(true);
          try {
            await add({ entity, entityId, body });
            setBody("");
          } catch (err) {
            toast(errorMessage(err), "error");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-2"
      >
        <label htmlFor={`note-${entityId}`} className="sr-only">
          Add a note
        </label>
        <Textarea
          id={`note-${entityId}`}
          rows={3}
          placeholder="Add a note — call summary, next step, anything the team should know"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[0.72rem] text-a-faint">Ctrl + Enter to save</span>
          <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!body.trim()}>
            Add note
          </Button>
        </div>
      </form>

      <ol className="mt-5 space-y-4">
        {sorted.map((n) =>
          n.kind === "event" ? (
            <li key={n._id} className="flex items-start gap-3 text-[0.8rem] text-a-muted">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-a-hover">
                <Lightning className="size-3.5" aria-hidden />
              </span>
              <span>
                {n.body} <span className="text-a-faint">· {n.authorName} · {relativeTime(n._creationTime)}</span>
              </span>
            </li>
          ) : (
            <li key={n._id} className="flex items-start gap-3">
              <Avatar name={n.authorName} size={24} />
              <div className="min-w-0 flex-1 rounded-[6px] border border-a-line bg-a-raised px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.78rem]">
                    <span className="font-semibold">{n.authorName}</span> <span className="text-a-faint">{relativeTime(n._creationTime)}</span>
                  </p>
                  {n.authorId === me?._id || me?.permissions.includes("users") ? (
                    <IconButton
                      label="Delete note"
                      tone="danger"
                      className="size-6"
                      onClick={async () => {
                        if (await confirm({ title: "Delete this note?", confirmLabel: "Delete", tone: "danger" })) {
                          remove({ noteId: n._id as Id<"notes"> }).catch((e) => toast(errorMessage(e), "error"));
                        }
                      }}
                    >
                      <Trash className="size-3.5" aria-hidden />
                    </IconButton>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[0.85rem] leading-relaxed">{n.body}</p>
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
