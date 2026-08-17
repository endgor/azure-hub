/**
 * Guide content types. Guides are rendered to HTML at build time by
 * scripts/generateSiteData.ts and read from src/generated/site-data.json.
 */

export interface GuideMeta {
  title: string;
  description: string;
  category: string;
  tags: string[];
  date: string;
}

export interface GuideHeading {
  id: string;
  text: string;
  level: number;
}

export interface Guide {
  slug: string;
  category: string;
  meta: GuideMeta;
  content?: string;
  headings?: GuideHeading[];
}

export interface GuideCategory {
  name: string;
  slug: string;
  description: string;
  guides: Guide[];
}
