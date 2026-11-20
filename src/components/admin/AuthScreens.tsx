"use client";

import { api } from "@convex/_generated/api";
import { Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Wordmark } from "@/components/site/Wordmark";
import { ROLE_LABEL } from "./nav";
import { errorField, errorMessage, refreshSite, useSession } from "./session";
import { Button, Field, Input } from "./ui";

function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-a-bg lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 p-12 text-chalk lg:flex lg:flex-col lg:justify-between">
        <span className="text-[2.2rem]">
          <Wordmark tagline="Advertising agency" />
        </span>
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ash">SCALE Studio</p>
          <p
            className="mt-4 max-w-[14ch] font-[family-name:var(--font-mona)] text-[3.4rem] font-black italic uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontVariationSettings: '"wdth" 125' }}
          >
            Briefs in. <span className="text-signal">Hires out.</span>
          </p>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-smoke">
            Leads, applications, jobs and every reel on the website — managed from one place.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.7rem] text-ash">
          <span className="rec-dot" aria-hidden /> Team access only
        </div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <span className="mb-10 block text-[1.8rem] lg:hidden">
            <Wordmark />
          </span>
          <h1 className="a-heading text-[1.6rem]">{title}</h1>
          {subtitle ? <div className="mt-2 text-[0.88rem] text-a-muted">{subtitle}</div> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Password field with a show/hide toggle. New passwords start visible, so there's no "confirm password" box to fill in. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  defaultVisible = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
  defaultVisible?: boolean;
}) {
  const [show, setShow] = useState(defaultVisible);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="pe-10"
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 end-0 grid w-10 cursor-pointer place-items-center text-a-faint hover:text-a-text"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeSlash className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-2 rounded-[5px] border border-a-danger/30 bg-a-danger-soft p-3 text-[0.84rem] text-a-danger">
      <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden />
      {message}
    </div>
  );
}

const agent = () => (typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : undefined);

/* ----------------------------- Login ------------------------------ */

export function LoginScreen() {
  const { me, setToken } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const target = next && next.startsWith("/admin") ? next : "/admin";
  const setup = useQuery(api.users.setupStatus, {});
  const signIn = useAction(api.authNode.signIn);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) router.replace(target);
  }, [me, router, target]);
  useEffect(() => {
    if (setup?.needsSetup) router.replace("/admin/setup");
  }, [setup, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await signIn({ username, password, userAgent: agent() });
      setToken(token);
      router.replace(target);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="With your username and password.">
      <FormAlert message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username" htmlFor="username">
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-[0.8rem] text-a-muted">Forgot your password? Ask an owner or admin for a reset link from Team access.</p>
      <Link href="/en" className="mt-8 inline-block text-[0.8rem] font-semibold text-a-muted hover:text-a-text">
        ← Back to the website
      </Link>
    </AuthLayout>
  );
}

/* ----------------------------- Setup ------------------------------ */

export function SetupScreen() {
  const { setToken } = useSession();
  const router = useRouter();
  const status = useQuery(api.users.setupStatus, {});
  const setupOwner = useAction(api.authNode.setupOwner);
  const [form, setForm] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field?: string; message?: string }>({});

  if (status && !status.needsSetup) {
    return (
      <AuthLayout title="Already set up" subtitle="This dashboard already has an owner.">
        <Link href="/admin/login" className="inline-flex h-9 items-center rounded-[4px] bg-signal px-4 font-semibold text-ink-950">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    setBusy(true);
    try {
      const { token } = await setupOwner({ username: form.username, password: form.password, userAgent: agent() });
      setToken(token);
      // Setup fills an empty site with the starter content; show it on the website right away.
      refreshSite(token);
      router.replace("/admin");
    } catch (err) {
      const field = errorField(err);
      if (field) setFieldError({ field, message: errorMessage(err) });
      else setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Set up SCALE Studio" subtitle="Choose the username and password you'll sign in with. You can add the rest of the team from inside.">
      <FormAlert message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username" htmlFor="username" hint="Letters and numbers, no spaces." error={fieldError.field === "username" ? fieldError.message : undefined}>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            aria-invalid={fieldError.field === "username" || undefined}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 4 characters." error={fieldError.field === "password" ? fieldError.message : undefined}>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            autoComplete="new-password"
            invalid={fieldError.field === "password"}
            defaultVisible
          />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

/* --------------------------- Invite + reset ------------------------ */

export function InviteScreen() {
  const { setToken } = useSession();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const info = useQuery(api.users.inviteInfo, token ? { inviteToken: token } : "skip");
  const accept = useAction(api.authNode.acceptInvite);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || info?.valid === false) {
    return (
      <AuthLayout title="This invite link doesn't work" subtitle="It may have expired or already been used. Ask whoever invited you for a new link.">
        <Link href="/admin/login" className="text-[0.85rem] font-semibold text-signal-600 hover:underline">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await accept({ inviteToken: token, password, userAgent: agent() });
      setToken(result.token);
      router.replace("/admin");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Join SCALE Studio"
      subtitle={
        info?.valid ? (
          <>
            You&apos;re joining as <strong className="text-a-text">{ROLE_LABEL[info.role] ?? info.role}</strong>. Your username is{" "}
            <strong className="text-a-text">{info.username}</strong>.
          </>
        ) : (
          "Checking your invite…"
        )
      }
    >
      <FormAlert message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="text" autoComplete="username" value={info?.valid ? info.username : ""} readOnly hidden />
        <Field label="Choose a password" htmlFor="password" hint="At least 4 characters.">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" defaultVisible />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!info?.valid}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ResetScreen() {
  const { setToken } = useSession();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const info = useQuery(api.users.resetInfo, token ? { resetToken: token } : "skip");
  const complete = useAction(api.authNode.completeReset);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || info?.valid === false) {
    return (
      <AuthLayout title="This reset link doesn't work" subtitle="It may have expired or already been used. Ask an owner or admin for a new one.">
        <Link href="/admin/login" className="text-[0.85rem] font-semibold text-signal-600 hover:underline">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await complete({ resetToken: token, password, userAgent: agent() });
      setToken(result.token);
      router.replace("/admin");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={
        info?.valid ? (
          <>
            For <strong className="text-a-text">{info.username}</strong>. You’ll be signed out everywhere else.
          </>
        ) : (
          "Checking your link…"
        )
      }
    >
      <FormAlert message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="text" autoComplete="username" value={info?.valid ? info.username : ""} readOnly hidden />
        <Field label="New password" htmlFor="password" hint="At least 4 characters.">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" defaultVisible />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!info?.valid}>
          Save password
        </Button>
      </form>
    </AuthLayout>
  );
}
