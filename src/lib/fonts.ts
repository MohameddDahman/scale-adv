import { Alexandria, IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Mona_Sans } from "next/font/google";

/** Mona Sans: wide + italic axes give us the wordmark's forward lean. */
export const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-mona",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Alexandria was designed by an Egyptian type designer; we use it for Arabic headlines. */
export const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-alexandria",
  display: "swap",
  preload: false,
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
});

export const fontVariables = [mona.variable, plexMono.variable, alexandria.variable, plexArabic.variable].join(" ");
