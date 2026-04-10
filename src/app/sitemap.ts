import { MetadataRoute } from 'next'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const baseUrl = 'https://www.dakhlamajalis.com'
const locales = ['ar', 'fr', 'en']

function createLocalizedEntry(
  route: string,
  lastModified: Date,
  locale: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {}
  for (const l of locales) {
    languages[l] = `${baseUrl}/${l}${route}`
  }
  languages['x-default'] = `${baseUrl}/ar${route}`

  return {
    url: `${baseUrl}/${locale}${route}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static routes with their metadata
  const staticRoutes: {
    path: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }[] = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/shipping', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/conditions-generales-de-ventes', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/politiques-de-retour', changeFrequency: 'yearly', priority: 0.5 },
  ]

  const entries: MetadataRoute.Sitemap = []

  // Generate localized entries for static routes
  for (const route of staticRoutes) {
    for (const locale of locales) {
      entries.push(
        createLocalizedEntry(route.path, now, locale, route.changeFrequency, route.priority)
      )
    }
  }

  // Category pages
  const categoryRoutes = ['sets', 'ready', 'outdoor', 'tents', 'accessories'];
  for (const category of categoryRoutes) {
    for (const locale of locales) {
      entries.push(
        createLocalizedEntry(`/products/${category}`, now, locale, 'weekly', 0.8)
      );
    }
  }

  // Subcategory pages
  try {
    const categories = await convex.query(api.categories.getCategories, {});
    const subcategories = categories.filter((c: any) => c.parentCategoryId);
    const parentCategories = categories.filter((c: any) => !c.parentCategoryId);

    for (const sub of subcategories) {
      const parent = parentCategories.find((p: any) => p._id === sub.parentCategoryId);
      if (parent) {
        for (const locale of locales) {
          entries.push(
            createLocalizedEntry(`/products/${parent.slug}/${sub.slug}`, now, locale, 'weekly', 0.7)
          );
        }
      }
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  // Fetch all active products and published blogs
  try {
    const products = await convex.query(api.products.getProducts, {
      status: 'active',
    })

    const filteredProducts = products.filter(
      (product) => product.slug && product.slug !== 'test'
    )

    for (const product of filteredProducts) {
      const lastModified = new Date(product.updatedAt || product.createdAt)
      for (const locale of locales) {
        entries.push(
          createLocalizedEntry(`/product/${product.slug}`, lastModified, locale, 'weekly', 0.7)
        )
      }
    }

    const blogs = await convex.query(api.blogs.getPublished)

    const filteredBlogs = blogs.filter(
      (blog) => blog.slug && blog.slug.trim() !== '' && blog.slug.trim() !== '-'
    )

    for (const blog of filteredBlogs) {
      const lastModified = new Date(blog.updatedAt || blog.createdAt)
      for (const locale of locales) {
        entries.push(
          createLocalizedEntry(`/blog/${blog.slug}`, lastModified, locale, 'weekly', 0.6)
        )
      }
    }
  } catch (error) {
    console.error('Error fetching products and blogs for sitemap:', error)
  }

  return entries
}
