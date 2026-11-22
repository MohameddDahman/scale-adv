"use client";

import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { createContext, useContext, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { BriefFlow, type BriefText } from "./BriefFlow";
import { KeyboardInset } from "./KeyboardInset";

type BriefApi = { open: () => void; contactHref: string; clientHref: string };
const BriefContext = createContext<BriefApi | null>(null);

/** Hosts the "Become our client" sheet once per page; any BriefLink can open it. */
export function BriefProvider({
  locale,
  text,
  contactHref,
  clientHref,
  children,
}: {
  locale: Locale;
  text: BriefText;
  contactHref: string;
  /** The page that is just this form: the link to share. */
  clientHref: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const api = useMemo<BriefApi>(() => ({ open: () => setOpen(true), contactHref, clientHref }), [contactHref, clientHref]);

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
 * "Become our client" buttons. They open the form in a sheet; with a modifier
 * key or before JavaScript loads they're a plain link to the /client page.
 * On a page that already shows the form (contact, /client) they scroll to it.
 */
export function BriefLink({ className, children, onOpen }: { className?: string; children: ReactNode; onOpen?: () => void }) {
  const brief = useContext(BriefContext);
  const pathname = usePathname();
  const clientHref = brief?.clientHref ?? "/client";
  const formHere = pathname === clientHref || pathname === brief?.contactHref;

  return (
    <a
      href={formHere ? "#brief" : clientHref}
      className={className}
      onClick={(ev: MouseEvent<HTMLAnchorElement>) => {
        onOpen?.();
        if (!brief || formHere || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        brief.open();
      }}
    >
      {children}
    </a>
  );
}
