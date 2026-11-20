"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Copy, DotsThree, Key, Prohibit, ShieldCheck, UserPlus, WhatsappLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { ROLE_HELP, ROLE_LABEL } from "../nav";
import { relativeTime } from "../format";
import { errorMessage, useAdminAction, useAdminMutation, useAdminQuery, useSession } from "../session";
import { Avatar, Badge, Button, EmptyState, Field, IconButton, Input, LoadingRows, Menu, MenuItem, Modal, PageHeader, Panel, Select, useFeedback } from "../ui";

const ROLES = ["owner", "admin", "editor", "recruiter", "sales"] as const;
type Role = (typeof ROLES)[number];

export function TeamAccessPage() {
  const data = useAdminQuery(api.users.list, {});
  const { me } = useSession();
  const updateRole = useAdminMutation(api.users.updateRole);
  const setActive = useAdminMutation(api.users.setActive);
  const revoke = useAdminMutation(api.users.revokeInvite);
  const createInvite = useAdminAction(api.authNode.createInvite);
  const createReset = useAdminAction(api.authNode.createResetLink);
  const { toast, confirm } = useFeedback();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<{ username: string; role: Role }>({ username: "", role: "editor" });
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ title: string; url: string; who: string } | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isOwner = me?.role === "owner";

  return (
    <div>
      <PageHeader
        title="Team access"
        description="Who can sign in to this dashboard, and what they can do. Invites and password resets are links you share yourself — on WhatsApp, for example."
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInviteOpen(true)}>
            Invite someone
          </Button>
        }
      />

      <Panel title="Members" padded={false}>
        {data === undefined ? (
          <LoadingRows />
        ) : (
          <ul className="divide-y divide-a-line">
            {data.users.map((u) => {
              const self = u._id === me?._id;
              const locked = (u.role === "owner" && !isOwner) || self;
              return (
                <li key={u._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={u.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {u.name} {self ? <span className="text-[0.75rem] font-normal text-a-faint">(you)</span> : null}
                    </p>
                    <p className="truncate text-[0.78rem] text-a-muted">
                      {u.username} · {u.lastLoginAt ? `last seen ${relativeTime(u.lastLoginAt)}` : "never signed in"}
                    </p>
                  </div>
                  {!u.active ? <Badge tone="danger">Disabled</Badge> : null}
                  <Select
                    aria-label={`Role for ${u.name}`}
                    className="!h-8 w-44"
                    value={u.role}
                    disabled={locked}
                    onChange={(e) =>
                      updateRole({ userId: u._id as Id<"users">, role: e.target.value as Role })
                        .then(() => toast(`${u.name} is now ${ROLE_LABEL[e.target.value]}`))
                        .catch((err) => toast(errorMessage(err), "error"))
                    }
                  >
                    {ROLES.filter((r) => r !== "owner" || isOwner || u.role === "owner").map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                  <Menu
                    trigger={
                      <IconButton label={`Actions for ${u.name}`} disabled={self}>
                        <DotsThree className="size-5" weight="bold" aria-hidden />
                      </IconButton>
                    }
                  >
                    <MenuItem
                      icon={<Key className="size-4" aria-hidden />}
                      disabled={u.role === "owner" && !isOwner}
                      onSelect={async () => {
                        try {
                          const { resetToken } = await createReset({ userId: u._id as Id<"users"> });
                          setLink({ title: `Password reset link for ${u.name}`, url: `${origin}/admin/reset?token=${resetToken}`, who: u.name });
                        } catch (e) {
                          toast(errorMessage(e), "error");
                        }
                      }}
                    >
                      Create password reset link
                    </MenuItem>
                    <MenuItem
                      icon={<Prohibit className="size-4" aria-hidden />}
                      tone={u.active ? "danger" : "default"}
                      disabled={u.role === "owner" && !isOwner}
                      onSelect={async () => {
                        if (u.active && !(await confirm({ title: `Disable ${u.name}?`, body: "They're signed out everywhere and can't sign in until you enable them again.", confirmLabel: "Disable", tone: "danger" }))) return;
                        setActive({ userId: u._id as Id<"users">, active: !u.active })
                          .then(() => toast(u.active ? `${u.name} disabled` : `${u.name} enabled`))
                          .catch((e) => toast(errorMessage(e), "error"));
                      }}
                    >
                      {u.active ? "Disable access" : "Enable access"}
                    </MenuItem>
                  </Menu>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Pending invites" className="mt-6" padded={false}>
        {!data?.invites.length ? (
          <EmptyState icon={<ShieldCheck className="size-6" aria-hidden />} title="No pending invites" />
        ) : (
          <ul className="divide-y divide-a-line">
            {data.invites.map((i) => (
              <li key={i._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.name}</p>
                  <p className="text-[0.78rem] text-a-muted">
                    {ROLE_LABEL[i.role]} · invited {relativeTime(i.createdAt)}
                  </p>
                </div>
                {i.expired ? <Badge tone="danger">Expired</Badge> : <Badge tone="info">Expires {relativeTime(i.expiresAt)}</Badge>}
                <Button size="sm" variant="ghost" className="text-a-danger" onClick={() => revoke({ inviteId: i._id as Id<"invites"> }).then(() => toast("Invite revoked"))}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="What each role can do" className="mt-6">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r) => (
            <div key={r} className="rounded-[5px] border border-a-line p-3">
              <dt className="font-semibold">{ROLE_LABEL[r]}</dt>
              <dd className="mt-1 text-[0.78rem] text-a-muted">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite someone"
        description="You'll get a link to send them. It works once and expires in 7 days."
        footer={
          <>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { inviteToken } = await createInvite({ username: form.username, role: form.role });
                  const who = form.username.trim();
                  setInviteOpen(false);
                  setLink({ title: `Invite link for ${who}`, url: `${origin}/admin/invite?token=${inviteToken}`, who });
                  setForm({ username: "", role: "editor" });
                } catch (e) {
                  toast(errorMessage(e), "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create invite link
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Username" htmlFor="inv-username" hint="They'll sign in with this and choose their own password. Letters and numbers, no spaces.">
            <Input
              id="inv-username"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Role" htmlFor="inv-role" hint={ROLE_HELP[form.role]}>
            <Select id="inv-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.filter((r) => r !== "owner" || isOwner).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal open={!!link} onOpenChange={(o) => !o && setLink(null)} title={link?.title ?? ""} description="Copy it now — for security, it's shown only once.">
        {link ? (
          <div className="space-y-3">
            <Input readOnly value={link.url} dir="ltr" onFocus={(e) => e.target.select()} className="font-mono text-[0.78rem]" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={<Copy className="size-4" aria-hidden />}
                onClick={async () => {
                  await navigator.clipboard.writeText(link.url);
                  toast("Link copied");
                }}
              >
                Copy link
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Your SCALE Studio link: ${link.url}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-a-line-strong px-3.5 text-[0.85rem] font-semibold hover:bg-a-hover"
              >
                <WhatsappLogo className="size-4" aria-hidden /> Send on WhatsApp
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
