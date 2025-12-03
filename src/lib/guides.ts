import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeStringify from 'rehype-stringify';
import rehypePrism from 'rehype-prism-plus';
import { z } from 'zod';

const guidesDirectory = path.join(process.cwd(), 'content/guides');

// Zod schema for frontmatter validation
const GuideMetaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  date: z.string().transform((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid date: ${v}`);
    }
    return d.toISOString();
  }),
});

export type GuideMeta = z.infer<typeof GuideMetaSchema>;

export interface Guide {
  slug: string;
  category: string;
  meta: GuideMeta;
  content?: string;
}

export interface GuideCategory {
  name: string;
  slug: string;
  description: string;
  guides: Guide[];
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
    } catch (error) {
      console.warn('Failed to load categories file:', error);
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
export function getGuidesByCategory(category: string): Guide[] {
  const categoryPath = path.join(guidesDirectory, category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const fileNames = fs.readdirSync(categoryPath);
  const guides: Guide[] = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(categoryPath, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      // Validate frontmatter with zod
      const validatedMeta = GuideMetaSchema.parse(data);

      return {
        slug,
        category,
        meta: validatedMeta
      };
    });

  // Sort by date descending
  guides.sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());

  return guides;
}

/**
 * Get all guides organized by category
 */
export function getAllGuides(): GuideCategory[] {
  const categories = getGuideCategories();
  const categoryInfo = loadCategoryInfo();

  return categories.map((categorySlug) => {
    const guides = getGuidesByCategory(categorySlug);
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
  });
}

/**
 * Get a specific guide by category and slug
 */
export async function getGuide(category: string, slug: string): Promise<Guide | null> {
  try {
    const fullPath = path.join(guidesDirectory, category, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Validate frontmatter with zod
    const validatedMeta = GuideMetaSchema.parse(data);

    // Custom sanitize schema that allows safe HTML elements and classes
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

    // Convert markdown to sanitized HTML with enhanced features
    const processedContent = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypePrism, { ignoreMissing: true })
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, { behavior: 'append' })
      .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
      .use(rehypeStringify)
      .process(content);

    const contentHtml = String(processedContent);

    return {
      slug,
      category,
      meta: validatedMeta,
      content: contentHtml
    };
  } catch (error) {
    console.error(`Error loading guide ${category}/${slug}:`, error);
    return null;
  }
}

/**
 * Get all guide slugs for static generation
 */
export function getAllGuideSlugs(): { category: string; slug: string }[] {
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
