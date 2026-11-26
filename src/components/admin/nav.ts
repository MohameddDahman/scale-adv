import {
  Briefcase,
  Cards,
  ChartLineUp,
  ClockCounterClockwise,
  FilmStrip,
  GearSix,
  Handshake,
  HardDrives,
  IdentificationCard,
  Images,
  Question,
  Quotes,
  ShieldCheck,
  SquaresFour,
  Stack,
  Tray,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import type { Permission } from "./session";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  perm: Permission;
  badge?: "newLeads" | "newApplications";
  keywords?: string;
};

export const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ href: "/admin", label: "Overview", icon: SquaresFour, perm: "dashboard", keywords: "home dashboard stats" }] },
  {
    group: "Inbox",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Tray, perm: "leads", badge: "newLeads", keywords: "clients briefs pipeline crm" },
      { href: "/admin/applications", label: "Applications", icon: IdentificationCard, perm: "careers", badge: "newApplications", keywords: "candidates hiring cv" },
    ],
  },
  {
    group: "Hiring",
    items: [
      { href: "/admin/jobs", label: "Jobs", icon: Briefcase, perm: "careers", keywords: "roles openings vacancies" },
      { href: "/admin/team", label: "Team on site", icon: UsersThree, perm: "content", keywords: "people staff members" },
    ],
  },
  {
    group: "Website",
    items: [
      { href: "/admin/work", label: "Reels", icon: FilmStrip, perm: "content", keywords: "videos work portfolio" },
      { href: "/admin/formats", label: "Format cards", icon: Cards, perm: "content", keywords: "formats that sell cards pictures thumbnails" },
      { href: "/admin/case-studies", label: "Case studies", icon: ChartLineUp, perm: "content", keywords: "results" },
      { href: "/admin/clients", label: "Clients", icon: Handshake, perm: "content", keywords: "brands logos roster" },
      { href: "/admin/services", label: "Services", icon: Stack, perm: "content" },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quotes, perm: "content", keywords: "quotes reviews" },
      { href: "/admin/faqs", label: "FAQs", icon: Question, perm: "content", keywords: "questions" },
      { href: "/admin/media", label: "Media library", icon: Images, perm: "media", keywords: "uploads images files" },
      { href: "/admin/storage", label: "Storage", icon: HardDrives, perm: "media", keywords: "space free plan quota cleanup cv files" },
    ],
  },
  {
    group: "Admin",
    items: [
      { href: "/admin/settings", label: "Site settings", icon: GearSix, perm: "settings", keywords: "contact social seo hero" },
      { href: "/admin/users", label: "Team access", icon: ShieldCheck, perm: "users", keywords: "users roles invite" },
      { href: "/admin/activity", label: "Activity log", icon: ClockCounterClockwise, perm: "activity", keywords: "audit history" },
    ],
  },
];

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Content editor",
  recruiter: "Recruiter",
  sales: "Sales",
};

export const ROLE_HELP: Record<string, string> = {
  owner: "Everything, including other owners.",
  admin: "Everything except managing owners.",
  editor: "Website content, reels, clients and media.",
  recruiter: "Jobs and applications.",
  sales: "Leads and the pipeline.",
};
