"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@convex/_generated/api";
import type { SettingsValue, Text } from "@convex/lib/validators";
import { FloppyDisk } from "@phosphor-icons/react";
import { useState } from "react";
import { BilingualInput, emptyText, ImageField, PairList } from "../fields";
import { errorMessage, useAdminMutation, useAdminQuery } from "../session";
import { Badge, Button, Field, Input, LoadingRows, PageHeader, Panel, Switch, TabPanel, Tabs, useFeedback } from "../ui";

type Section = keyof SettingsValue;

const TABS: { value: Section; label: string; description: string }[] = [
  { value: "hero", label: "Homepage", description: "The headline and line under it. Keep line 2 short — it's the orange one." },
  { value: "stats", label: "Numbers", description: "Shown under the homepage buttons, on the Services page and on the Agency page, counting up. Type plain numbers like 18000000 and the site shows 18M+ (180000 shows 180K+). A row with no number is hidden." },
  { value: "contact", label: "Contact", description: "Empty fields are hidden on the site." },
  { value: "social", label: "Social", description: "Full links, e.g. https://www.instagram.com/scale_adv/ — empty ones are hidden." },
  { value: "careers", label: "Careers", description: "The careers page intro, what it's like to work here, and the hiring steps." },
  { value: "seo", label: "Search & sharing", description: "What Google and WhatsApp/Facebook previews show." },
  { value: "announcement", label: "Announcement bar", description: "A thin orange bar above the menu on every page." },
  { value: "general", label: "General", description: "Name and footer text." },
];

export function SettingsPage() {
  const remote = useAdminQuery(api.settings.get, {});
  const save = useAdminMutation(api.settings.save, { refresh: true });
  const { toast } = useFeedback();
  const [tab, setTab] = useState<Section>("hero");
  const [draft, setDraft] = useState<(SettingsValue & { ogImageUrl?: string | null }) | null>(null);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);

  // First load: copy the saved settings into an editable draft (derived state, no effect needed).
  if (remote && !draft) {
    setDraft(remote as any);
    setBaseline(JSON.stringify(remote));
  }

  if (!draft) return <LoadingRows rows={10} />;

  const dirtySections = TABS.filter((t) => JSON.stringify(draft[t.value]) !== JSON.stringify(JSON.parse(baseline || "{}")[t.value])).map((t) => t.value);
  const set = <K extends Section>(key: K, value: SettingsValue[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  async function onSave() {
    if (!draft || !dirtySections.length) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const s of dirtySections) {
        const value = draft[s] as any;
        if (s === "seo") patch.seo = { title: value.title, description: value.description, ...(value.ogImage ? { ogImage: value.ogImage } : {}) };
        else patch[s] = value;
      }
      await save({ patch: patch as any });
      setBaseline(JSON.stringify(draft));
      toast("Settings saved — the website updates in a moment");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  const current = TABS.find((t) => t.value === tab)!;

  return (
    <div>
      <PageHeader
        title="Site settings"
        description="Text and details that appear across the whole website."
        actions={
          <>
            {dirtySections.length ? <Badge tone="warn" dot>{dirtySections.length} unsaved section{dirtySections.length > 1 ? "s" : ""}</Badge> : null}
            <Button variant="primary" icon={<FloppyDisk className="size-4" aria-hidden />} loading={saving} disabled={!dirtySections.length} onClick={onSave}>
              Save changes
            </Button>
          </>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Section)}
        tabs={TABS.map((t) => ({ value: t.value, label: <span className="inline-flex items-center gap-1.5">{t.label}{dirtySections.includes(t.value) ? <span className="size-1.5 rounded-full bg-signal" aria-label="unsaved" /> : null}</span> }))}
      >
        <TabPanel value={tab} forceMount>
          <Panel title={current.label} description={current.description}>
            <div className="max-w-4xl space-y-5">
              {tab === "hero" ? (
                <>
                  <Field label="Small line above the headline">
                    <BilingualInput value={draft.hero.eyebrow} onChange={(v) => set("hero", { ...draft.hero, eyebrow: v })} />
                  </Field>
                  <Field label="Headline — line 1">
                    <BilingualInput value={draft.hero.line1} onChange={(v) => set("hero", { ...draft.hero, line1: v })} />
                  </Field>
                  <Field label="Headline — line 2 (orange)">
                    <BilingualInput value={draft.hero.line2} onChange={(v) => set("hero", { ...draft.hero, line2: v })} />
                  </Field>
                  <Field label="Paragraph under the headline">
                    <BilingualInput multiline rows={3} value={draft.hero.sub} onChange={(v) => set("hero", { ...draft.hero, sub: v })} />
                  </Field>
                  <Switch
                    checked={draft.hero.showTimeline}
                    onCheckedChange={(v) => set("hero", { ...draft.hero, showTimeline: v })}
                    label="Show the reel timeline"
                    description="The interactive “anatomy of a reel” editor, now on the Services page. Its frames come from your published reels."
                  />
                </>
              ) : null}

              {tab === "stats" ? (
                <PairList
                  items={draft.stats}
                  onChange={(stats) => set("stats", stats)}
                  addLabel="Add number"
                  make={() => ({ value: "", label: emptyText() })}
                  render={(item, update) => (
                    <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                      <Input aria-label="Value" placeholder="e.g. 12+" value={item.value} onChange={(e) => update({ ...item, value: e.target.value })} />
                      <BilingualInput value={item.label} onChange={(label) => update({ ...item, label })} placeholder={{ en: "Label", ar: "الوصف" }} />
                    </div>
                  )}
                />
              ) : null}

              {tab === "contact" ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="WhatsApp number" hint="Used for every “WhatsApp us” button. Local format is fine, e.g. 010 1234 5678.">
                    <Input dir="ltr" value={draft.contact.whatsapp} onChange={(e) => set("contact", { ...draft.contact, whatsapp: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <Input dir="ltr" value={draft.contact.phone} onChange={(e) => set("contact", { ...draft.contact, phone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={draft.contact.email} onChange={(e) => set("contact", { ...draft.contact, email: e.target.value })} />
                  </Field>
                  <Field label="Google Maps link">
                    <Input dir="ltr" value={draft.contact.mapUrl} onChange={(e) => set("contact", { ...draft.contact, mapUrl: e.target.value })} />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <BilingualInput value={draft.contact.address} onChange={(v) => set("contact", { ...draft.contact, address: v })} />
                  </Field>
                  <Field label="Working hours" className="sm:col-span-2">
                    <BilingualInput value={draft.contact.hours} onChange={(v) => set("contact", { ...draft.contact, hours: v })} placeholder={{ en: "Sun–Thu, 10:00–18:00", ar: "الأحد–الخميس، ١٠ص–٦م" }} />
                  </Field>
                </div>
              ) : null}

              {tab === "social" ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {(Object.keys(draft.social) as (keyof SettingsValue["social"])[]).map((key) => (
                    <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
                      <Input dir="ltr" placeholder="https://" value={draft.social[key]} onChange={(e) => set("social", { ...draft.social, [key]: e.target.value })} />
                    </Field>
                  ))}
                </div>
              ) : null}

              {tab === "careers" ? (
                <>
                  <Switch
                    checked={draft.careers.accepting}
                    onCheckedChange={(v) => set("careers", { ...draft.careers, accepting: v })}
                    label="Accept open applications"
                    description="Off hides the “Send an open application” form. Applications to open roles still work."
                  />
                  <Field label="Intro paragraph">
                    <BilingualInput multiline rows={3} value={draft.careers.intro} onChange={(v) => set("careers", { ...draft.careers, intro: v })} />
                  </Field>
                  <Field label="What it's like here" hint="Four short points work best.">
                    <TitleBodyList items={draft.careers.perks} onChange={(perks) => set("careers", { ...draft.careers, perks })} addLabel="Add point" />
                  </Field>
                  <Field label="How hiring works" hint="In order. Shown as numbered steps.">
                    <TitleBodyList items={draft.careers.steps} onChange={(steps) => set("careers", { ...draft.careers, steps })} addLabel="Add step" />
                  </Field>
                </>
              ) : null}

              {tab === "seo" ? (
                <>
                  <Field label="Page title" hint="Around 60 characters. Shown in Google and browser tabs.">
                    <BilingualInput value={draft.seo.title} onChange={(v) => set("seo", { ...draft.seo, title: v })} />
                  </Field>
                  <Field label="Description" hint="Around 155 characters. Shown under the title in Google.">
                    <BilingualInput multiline rows={3} value={draft.seo.description} onChange={(v) => set("seo", { ...draft.seo, description: v })} />
                  </Field>
                  <Field label="Share image" hint="1200×630. Shown when the site is shared on WhatsApp, Facebook or X.">
                    <ImageField
                      storageId={draft.seo.ogImage}
                      path={draft.ogImageUrl ?? undefined}
                      aspect="aspect-[1200/630]"
                      preset="share"
                      onChange={(next) => setDraft((d) => (d ? { ...d, seo: { ...d.seo, ogImage: next.storageId }, ogImageUrl: undefined } : d))}
                    />
                  </Field>
                </>
              ) : null}

              {tab === "announcement" ? (
                <>
                  <Switch checked={draft.announcement.enabled} onCheckedChange={(v) => set("announcement", { ...draft.announcement, enabled: v })} label="Show the announcement bar" />
                  <Field label="Text">
                    <BilingualInput value={draft.announcement.text} onChange={(v) => set("announcement", { ...draft.announcement, text: v })} />
                  </Field>
                  <Field label="Link" hint="A page like /careers or a full https:// link.">
                    <Input dir="ltr" value={draft.announcement.href} onChange={(e) => set("announcement", { ...draft.announcement, href: e.target.value })} />
                  </Field>
                </>
              ) : null}

              {tab === "general" ? (
                <>
                  <Field label="Agency name">
                    <Input value={draft.general.agencyName} onChange={(e) => set("general", { ...draft.general, agencyName: e.target.value })} />
                  </Field>
                  <Field label="Tagline" hint="Under the logo in the footer.">
                    <BilingualInput value={draft.general.tagline} onChange={(v) => set("general", { ...draft.general, tagline: v })} />
                  </Field>
                  <Field label="Footer note">
                    <BilingualInput multiline rows={2} value={draft.general.footerNote} onChange={(v) => set("general", { ...draft.general, footerNote: v })} />
                  </Field>
                </>
              ) : null}
            </div>
          </Panel>
        </TabPanel>
      </Tabs>
    </div>
  );
}

function TitleBodyList({ items, onChange, addLabel }: { items: { title: Text; body: Text }[]; onChange: (v: { title: Text; body: Text }[]) => void; addLabel: string }) {
  return (
    <PairList
      items={items}
      onChange={onChange}
      addLabel={addLabel}
      make={() => ({ title: emptyText(), body: emptyText() })}
      render={(item, update) => (
        <div className="space-y-2">
          <BilingualInput value={item.title} onChange={(title) => update({ ...item, title })} placeholder={{ en: "Title", ar: "العنوان" }} />
          <BilingualInput multiline rows={2} value={item.body} onChange={(body) => update({ ...item, body })} placeholder={{ en: "One or two sentences", ar: "جملة أو اتنين" }} />
        </div>
      )}
    />
  );
}
