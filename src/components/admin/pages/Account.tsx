"use client";

import { api } from "@convex/_generated/api";
import { useState } from "react";
import { ROLE_HELP, ROLE_LABEL } from "../nav";
import { useTheme } from "../Shell";
import { errorMessage, useAdminAction, useAdminMutation, useSession } from "../session";
import { Badge, Button, Field, Input, PageHeader, Panel, Segmented, useFeedback } from "../ui";

export function AccountPage() {
  const { me } = useSession();
  const updateProfile = useAdminMutation(api.users.updateProfile);
  const signOutOthers = useAdminMutation(api.users.signOutOthers);
  const changePassword = useAdminAction(api.authNode.changePassword);
  const { toast } = useFeedback();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(me?.name ?? "");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Your account" description={`${me?.email} · ${ROLE_LABEL[me?.role ?? ""] ?? ""}`} />
      <div className="space-y-6">
        <Panel title="Profile">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy("name");
              try {
                await updateProfile({ name });
                toast("Name updated");
              } catch (err) {
                toast(errorMessage(err), "error");
              } finally {
                setBusy(null);
              }
            }}
          >
            <Field label="Display name" htmlFor="acc-name" className="min-w-64 flex-1">
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Button type="submit" loading={busy === "name"} disabled={!name.trim() || name === me?.name}>
              Save
            </Button>
          </form>
          <p className="mt-4 flex items-center gap-2 text-[0.8rem] text-a-muted">
            <Badge tone="accent">{ROLE_LABEL[me?.role ?? ""]}</Badge> {ROLE_HELP[me?.role ?? ""]}
          </p>
        </Panel>

        <Panel title="Password" description="At least 10 characters. Changing it signs you out on other devices.">
          <form
            className="grid gap-4 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pw.next !== pw.confirm) return toast("The new passwords don't match.", "error");
              setBusy("pw");
              try {
                await changePassword({ currentPassword: pw.current, newPassword: pw.next });
                setPw({ current: "", next: "", confirm: "" });
                toast("Password changed");
              } catch (err) {
                toast(errorMessage(err), "error");
              } finally {
                setBusy(null);
              }
            }}
          >
            <input type="email" autoComplete="username" value={me?.email ?? ""} readOnly hidden />
            <Field label="Current password" htmlFor="pw-current">
              <Input id="pw-current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <Field label="New password" htmlFor="pw-next">
              <Input id="pw-next" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-confirm">
              <Input id="pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" loading={busy === "pw"} disabled={!pw.current || !pw.next}>
                Change password
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Appearance">
          <Segmented
            label="Theme"
            value={theme}
            onChange={(v) => v !== theme && toggle()}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Panel>

        <Panel title="Sessions" description="Signed in on a shared or lost device? End every other session.">
          <Button
            loading={busy === "sessions"}
            onClick={async () => {
              setBusy("sessions");
              try {
                const n = await signOutOthers({});
                toast(n ? `Signed out of ${n} other session${n > 1 ? "s" : ""}` : "No other sessions were active");
              } catch (err) {
                toast(errorMessage(err), "error");
              } finally {
                setBusy(null);
              }
            }}
          >
            Sign out everywhere else
          </Button>
        </Panel>
      </div>
    </div>
  );
}
