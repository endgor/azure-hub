import fs from 'fs';
import path from 'path';

const guidesDirectory = path.join(process.cwd(), 'content/guides');

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

interface MatterResult {
  data: unknown;
  content: string;
}

function parseGuideMeta(data: unknown): GuideMeta {
  if (!data || typeof data !== 'object') {
    throw new Error('Guide frontmatter is missing.');
  }

  const candidate = data as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const description = typeof candidate.description === 'string' ? candidate.description.trim() : '';
  const category = typeof candidate.category === 'string' ? candidate.category.trim() : '';
  const rawTags = Array.isArray(candidate.tags) ? candidate.tags : [];
  const tags = rawTags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean);
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

// Load category metadata from content file
let categoryInfoCache: Record<string, { name: string; description: string }> | null = null;

function loadCategoryInfo(): Record<string, { name: string; description: string }> {
  if (categoryInfoCache) {
    return categoryInfoCache;
  }

  const categoriesFile = path.join(process.cwd(), 'content/guides/_categories.json');

  if (fs.existsSync(categoriesFile)) {
    try {
      const content = fs.readFileSync(categoriesFile, 'utf8');
      categoryInfoCache = JSON.parse(content);
      return categoryInfoCache!;
    } catch {
      // Fall through to default
    }
  }

  // Fallback to default
  categoryInfoCache = {
    'virtual-machines': {
      name: 'Virtual Machines',
      description: 'Guides about Azure VMs, sizing, and compute resources'
    }
  };

  return categoryInfoCache;
}

/**
 * Get all available guide categories
 */
export function getGuideCategories(): string[] {
  if (!fs.existsSync(guidesDirectory)) {
    return [];
  }

  return fs.readdirSync(guidesDirectory).filter((item) => {
    const fullPath = path.join(guidesDirectory, item);
    return fs.statSync(fullPath).isDirectory();
  });
}

/**
 * Get all guides from a specific category
 */
async function parseMarkdownFile(fileContents: string): Promise<MatterResult> {
  const matter = (await import('gray-matter')).default;
  return matter(fileContents) as MatterResult;
}

export async function getGuidesByCategory(category: string): Promise<Guide[]> {
  const categoryPath = path.join(guidesDirectory, category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const fileNames = fs.readdirSync(categoryPath);
  const guides = await Promise.all(fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map(async (fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(categoryPath, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = await parseMarkdownFile(fileContents);

      const validatedMeta = parseGuideMeta(data);

      return {
        slug,
        category,
        meta: validatedMeta
      };
    }));

  // Sort by date descending
  guides.sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());

  return guides;
}

/**
 * Get all guides organized by category
 */
export async function getAllGuides(): Promise<GuideCategory[]> {
  const categories = getGuideCategories();
  const categoryInfo = loadCategoryInfo();

  return Promise.all(categories.map(async (categorySlug) => {
    const guides = await getGuidesByCategory(categorySlug);
    const info = categoryInfo[categorySlug] || {
      name: categorySlug,
      description: ''
    };

    return {
      name: info.name,
      slug: categorySlug,
      description: info.description,
      guides
    };
  }));
}

/**
 * Get a specific guide by category and slug
 */
export async function getGuide(category: string, slug: string): Promise<Guide | null> {
  try {
    const fullPath = path.join(guidesDirectory, category, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = await parseMarkdownFile(fileContents);

    const validatedMeta = parseGuideMeta(data);

    const [{ unified }, remarkParse, remarkGfm, remarkRehype, rehypeRaw, rehypeSanitizeModule, rehypeSlug, rehypeAutolinkHeadings, rehypeExternalLinks, rehypeStringify, rehypePrism] = await Promise.all([
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
      import('rehype-prism-plus')
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
      tagNames: [
        ...(defaultSchema.tagNames || []),
        'span'
      ]
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
      .process(content);

    const contentHtml = String(processedContent);

    // Extract headings for TOC
    const headingRegex = /<h([2-3])\s+id="([^"]+)"[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>)*[^<]*)/g;
    const headings: GuideHeading[] = [];
    let match;
    while ((match = headingRegex.exec(contentHtml)) !== null) {
      const text = match[3].replace(/<[^>]+>/g, '').trim();
      if (text) {
        headings.push({ id: match[2], text, level: parseInt(match[1], 10) });
      }
    }

    return {
      slug,
      category,
      meta: validatedMeta,
      content: contentHtml,
      headings
    };
  } catch {
    return null;
  }
}

/**
 * Get all guide slugs for static generation
 */
export async function getAllGuideSlugs(): Promise<{ category: string; slug: string }[]> {
  const categories = getGuideCategories();
  const slugs: { category: string; slug: string }[] = [];

  categories.forEach((category) => {
    const categoryPath = path.join(guidesDirectory, category);
    const fileNames = fs.readdirSync(categoryPath);

    fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .forEach((fileName) => {
        slugs.push({
          category,
          slug: fileName.replace(/\.md$/, '')
        });
      });
  });

  return slugs;
}
