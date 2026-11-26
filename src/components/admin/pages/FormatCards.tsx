"use client";

import { api } from "@convex/_generated/api";
import type { FormatCardValue } from "@convex/lib/validators";
import { FloppyDisk } from "@phosphor-icons/react";
import { useState } from "react";
import { BilingualInput, emptyText, ImageField, PairList } from "../fields";
import { errorMessage, useAdminMutation, useAdminQuery } from "../session";
import { Badge, Button, Field, LoadingRows, PageHeader, Panel, Switch, useFeedback } from "../ui";

/** "Formats that sell" on the homepage and the Services page: each card's picture, text and visibility. */
export function FormatCardsPage() {
  const remote = useAdminQuery(api.formats.get, {});
  const save = useAdminMutation(api.formats.save, { refresh: true });
  const { toast } = useFeedback();
  const [draft, setDraft] = useState<FormatCardValue[] | null>(null);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);

  // First load: copy the saved cards into an editable draft (derived state, no effect needed).
  if (remote && !draft) {
    setDraft(remote);
    setBaseline(JSON.stringify(remote));
  }
  if (!draft) return <LoadingRows rows={8} />;
  const dirty = JSON.stringify(draft) !== baseline;

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await save({ cards: draft });
      setBaseline(JSON.stringify(draft));
      toast("Format cards saved — the website updates in a moment");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Format cards"
        description="The cards under “Formats that sell” on the homepage and the Services page."
        actions={
          <>
            {dirty ? (
              <Badge tone="warn" dot>
                Unsaved changes
              </Badge>
            ) : null}
            <Button variant="primary" icon={<FloppyDisk className="size-4" aria-hidden />} loading={saving} disabled={!dirty} onClick={onSave}>
              Save changes
            </Button>
          </>
        }
      />
      <Panel
        title="Cards"
        description="In the order they appear. Upload a tall picture for each card. A card without a picture shows the cover of a published reel of the same format, if there is one. Switch a card off to hide it without losing it."
      >
        <div className="max-w-4xl">
          <PairList<FormatCardValue>
            items={draft}
            onChange={setDraft}
            addLabel="Add card"
            make={() => ({
              key: `card-${Date.now().toString(36)}`,
              name: emptyText(),
              line: emptyText(),
              best: emptyText(),
              length: emptyText(),
              hidden: false,
            })}
            render={(card, update) => (
              <div className="space-y-3">
                <ImageField
                  storageId={card.image}
                  aspect="aspect-[9/16]"
                  preset="poster"
                  allowLink={false}
                  hint="The card's picture. Tall photos (9:16) fill it best."
                  onChange={(next) => {
                    const { image: _old, ...rest } = card;
                    update(next.storageId ? { ...rest, image: next.storageId } : rest);
                  }}
                />
                <Field label="Title">
                  <BilingualInput value={card.name} onChange={(name) => update({ ...card, name })} placeholder={{ en: "e.g. Street interview", ar: "مثلًا: لقاء شارع" }} />
                </Field>
                <Field label="Short line">
                  <BilingualInput multiline rows={2} value={card.line} onChange={(line) => update({ ...card, line })} placeholder={{ en: "One short sentence", ar: "جملة قصيرة" }} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Best for">
                    <BilingualInput value={card.best} onChange={(best) => update({ ...card, best })} placeholder={{ en: "Awareness and social proof", ar: "الانتشار وثقة الناس" }} />
                  </Field>
                  <Field label="Length">
                    <BilingualInput value={card.length} onChange={(length) => update({ ...card, length })} placeholder={{ en: "15–30s", ar: "15–30 ث" }} />
                  </Field>
                </div>
                <Switch checked={!card.hidden} onCheckedChange={(on) => update({ ...card, hidden: !on })} label="Show on the website" />
              </div>
            )}
          />
        </div>
      </Panel>
    </div>
  );
}
