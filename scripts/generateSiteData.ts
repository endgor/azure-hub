import fs from 'fs';
import path from 'path';

interface GuideMeta {
  title: string;
  description: string;
  category: string;
  tags: string[];
  date: string;
}

interface GuideHeading {
  id: string;
  text: string;
  level: number;
}

interface Guide {
  slug: string;
  category: string;
  meta: GuideMeta;
  content: string;
  headings: GuideHeading[];
}

interface GuideCategory {
  name: string;
  slug: string;
  description: string;
  guides: Array<Omit<Guide, 'content' | 'headings'>>;
}

interface GeneratedSiteData {
  home: {
    lastUpdated: string | null;
  };
  about: {
    fileMetadata: unknown[];
    rbacLastRetrieved: string | null;
  };
  rbac: {
    roleCount: number;
    namespaceCount: number;
  };
  entraid: {
    roleCount: number;
    hasData: boolean;
  };
  serviceTags: {
    baseServiceTags: string[];
  };
  guides: {
    categories: GuideCategory[];
    guides: Guide[];
  };
}

interface MatterResult {
  data: unknown;
  content: string;
}

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const OUTPUT_FILE = path.join(ROOT, 'src', 'generated', 'site-data.json');

function parseGuideMeta(data: unknown): GuideMeta {
  if (!data || typeof data !== 'object') {
    throw new Error('Guide frontmatter is missing.');
  }

  const candidate = data as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const description = typeof candidate.description === 'string' ? candidate.description.trim() : '';
  const category = typeof candidate.category === 'string' ? candidate.category.trim() : '';
  const rawTags = Array.isArray(candidate.tags) ? candidate.tags : [];
  const tags = rawTags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const rawDate = typeof candidate.date === 'string' ? candidate.date.trim() : '';
  const parsedDate = new Date(rawDate);

  if (!title) {
    throw new Error('Guide title is required.');
  }
  if (!description) {
    throw new Error('Guide description is required.');
  }
  if (!category) {
    throw new Error('Guide category is required.');
  }
  if (!rawDate || Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid guide date: ${rawDate}`);
  }

  return {
    title,
    description,
    category,
    tags,
    date: parsedDate.toISOString(),
  };
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function parseMarkdownFile(fileContents: string): Promise<MatterResult> {
  const matter = (await import('gray-matter')).default;
  return matter(fileContents) as MatterResult;
}

async function renderGuideContent(markdown: string): Promise<{ content: string; headings: GuideHeading[] }> {
  const [
    { unified },
    remarkParse,
    remarkGfm,
    remarkRehype,
    rehypeRaw,
    rehypeSanitizeModule,
    rehypeSlug,
    rehypeAutolinkHeadings,
    rehypeExternalLinks,
    rehypeStringify,
    rehypePrism,
  ] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
    import('remark-rehype'),
    import('rehype-raw'),
    import('rehype-sanitize'),
    import('rehype-slug'),
    import('rehype-autolink-headings'),
    import('rehype-external-links'),
    import('rehype-stringify'),
    import('rehype-prism-plus'),
  ]);

  const rehypeSanitize = rehypeSanitizeModule.default;
  const defaultSchema = rehypeSanitizeModule.defaultSchema;

  const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
      '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'id'],
      code: [...(defaultSchema.attributes?.code || []), 'className'],
      pre: [...(defaultSchema.attributes?.pre || []), 'className'],
      span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    },
    tagNames: [...(defaultSchema.tagNames || []), 'span'],
  };

  const processedContent = await unified()
    .use(remarkParse.default)
    .use(remarkGfm.default)
    .use(remarkRehype.default, { allowDangerousHtml: true })
    .use(rehypeRaw.default)
    .use(rehypePrism.default, { ignoreMissing: true })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSlug.default)
    .use(rehypeAutolinkHeadings.default, { behavior: 'append' })
    .use(rehypeExternalLinks.default, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeStringify.default)
    .process(markdown);

  const content = String(processedContent);
  const headingRegex = /<h([2-3])\s+id="([^"]+)"[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>)*[^<]*)/g;
  const headings: GuideHeading[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    if (text) {
      headings.push({
        id: match[2],
        text,
        level: parseInt(match[1], 10),
      });
    }
  }

  return { content, headings };
}

async function buildGuidesData(): Promise<GeneratedSiteData['guides']> {
  const categoryInfo = readJsonFile<Record<string, { name: string; description: string }>>(
    path.join(GUIDES_DIR, '_categories.json'),
    {}
  );

  const categorySlugs = fs.existsSync(GUIDES_DIR)
    ? fs.readdirSync(GUIDES_DIR).filter((entry) => fs.statSync(path.join(GUIDES_DIR, entry)).isDirectory())
    : [];

  const guides: Guide[] = [];

  for (const category of categorySlugs) {
    const categoryPath = path.join(GUIDES_DIR, category);
    const fileNames = fs.readdirSync(categoryPath).filter((fileName) => fileName.endsWith('.md'));

    for (const fileName of fileNames) {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(categoryPath, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content: markdown } = await parseMarkdownFile(fileContents);
      const meta = parseGuideMeta(data);
      const rendered = await renderGuideContent(markdown);

      guides.push({
        slug,
        category,
        meta,
        content: rendered.content,
        headings: rendered.headings,
      });
    }
  }

  guides.sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());

  const categories: GuideCategory[] = categorySlugs.map((slug) => {
    const info = categoryInfo[slug] || { name: slug, description: '' };
    const categoryGuides = guides
      .filter((guide) => guide.category === slug)
      .map(({ content: _content, headings: _headings, ...guide }) => guide);

    return {
      name: info.name,
      slug,
      description: info.description,
      guides: categoryGuides,
    };
  });

  return { categories, guides };
}

function buildRbacSummary() {
  const roles = readJsonFile<Array<{ roleType?: string; permissions?: Array<{ actions?: string[]; dataActions?: string[] }> }>>(
    path.join(DATA_DIR, 'roles-extended.json'),
    []
  );
  const namespaces = new Set<string>();

  for (const role of roles) {
    for (const permission of role.permissions || []) {
      for (const action of [...(permission.actions || []), ...(permission.dataActions || [])]) {
        const namespace = action.split('/')[0];
        if (namespace) {
          namespaces.add(namespace.toLowerCase());
        }
      }
    }
  }

  return {
    roleCount: roles.filter((role) => role.roleType === 'BuiltInRole').length,
    namespaceCount: namespaces.size,
  };
}

function buildEntraSummary() {
  const roles = readJsonFile<Array<{ isBuiltIn?: boolean }>>(
    path.join(DATA_DIR, 'entraid-roles.json'),
    []
  );

  return {
    roleCount: roles.filter((role) => role.isBuiltIn).length,
    hasData: roles.length > 0,
  };
}

function buildServiceTagSummary() {
  const index = readJsonFile<Array<{ id: string }>>(
    path.join(DATA_DIR, 'service-tags-index.json'),
    []
  );
  const tagSet = new Set<string>();

  for (const entry of index) {
    if (!entry.id.includes('.')) {
      tagSet.add(entry.id);
    }
  }

  return {
    baseServiceTags: Array.from(tagSet).sort(),
  };
}

async function main() {
  const fileMetadata = readJsonFile<unknown[]>(path.join(DATA_DIR, 'file-metadata.json'), []);
  const rbacLastRetrieved = Array.isArray(fileMetadata) && fileMetadata.length > 0
    ? (fileMetadata[0] as { lastRetrieved?: string }).lastRetrieved ?? null
    : null;

  const siteData: GeneratedSiteData = {
    home: {
      lastUpdated: rbacLastRetrieved,
    },
    about: {
      fileMetadata,
      rbacLastRetrieved,
    },
    rbac: buildRbacSummary(),
    entraid: buildEntraSummary(),
    serviceTags: buildServiceTagSummary(),
    guides: await buildGuidesData(),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(siteData, null, 2) + '\n', 'utf8');

  console.info(`Generated static site data at ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('Failed to generate static site data:', error);
  process.exit(1);
});
