"use client";

import { use } from "react";
import { ResourceEditor, ResourceList, type ResourceConfig } from "./resource";
import {
  caseStudiesConfig,
  clientsConfig,
  faqsConfig,
  jobsConfig,
  reelsConfig,
  servicesConfig,
  teamConfig,
  testimonialsConfig,
} from "./resources";

const CONFIGS = {
  clients: clientsConfig,
  services: servicesConfig,
  reels: reelsConfig,
  caseStudies: caseStudiesConfig,
  faqs: faqsConfig,
  testimonials: testimonialsConfig,
  team: teamConfig,
  jobs: jobsConfig,
} satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof CONFIGS;

export function ListPage({ resource }: { resource: ResourceKey }) {
  return <ResourceList config={CONFIGS[resource]} />;
}

export function EditorPage({ resource, params }: { resource: ResourceKey; params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceEditor key={id} config={CONFIGS[resource]} id={id} />;
}
