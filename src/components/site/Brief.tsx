"use client";

import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { createContext, useContext, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { BriefFlow, type BriefText } from "./BriefFlow";
import { KeyboardInset } from "./KeyboardInset";

type BriefApi = { open: () => void; contactHref: string };
const BriefContext = createContext<BriefApi | null>(null);

/** Hosts the "Start a project" dialog once per page; any BriefLink can open it. */
export function BriefProvider({
  locale,
  text,
  contactHref,
  children,
}: {
  locale: Locale;
  text: BriefText;
  contactHref: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const api = useMemo<BriefApi>(() => ({ open: () => setOpen(true), contactHref }), [contactHref]);

  return (
    <BriefContext.Provider value={api}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="brief-overlay" />
          <Dialog.Content className="brief-dialog" onOpenAutoFocus={(ev) => ev.preventDefault()}>
            <Dialog.Title className="sr-only">{text.b.title}</Dialog.Title>
            <Dialog.Description className="sr-only">{text.b.description}</Dialog.Description>
            <KeyboardInset />
            <BriefFlow locale={locale} text={text} mode="dialog" autoFocus onClose={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </BriefContext.Provider>
  );
}

/**
 * "Start a project" buttons. They open the brief in place; with a modifier
 * key, before JavaScript loads, or on the contact page itself they behave
 * like a normal link to the brief on the contact page.
 */
export function BriefLink({ className, children, onOpen }: { className?: string; children: ReactNode; onOpen?: () => void }) {
  const brief = useContext(BriefContext);
  const pathname = usePathname();
  const contactHref = brief?.contactHref ?? "/contact";
  const onContactPage = pathname === contactHref;

  return (
    <a
      href={`${contactHref}#brief`}
      className={className}
      onClick={(ev: MouseEvent<HTMLAnchorElement>) => {
        onOpen?.();
        if (!brief || onContactPage || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        brief.open();
      }}
    >
      {children}
    </a>
  );
}
