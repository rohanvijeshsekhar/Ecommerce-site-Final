import { MetadataRoute } from 'next';
import { serverFetch } from '../lib/server-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  // Base pages
  const routes = ['', '/products', '/combo-deals', '/blog', '/cart', '/wishlist', '/profile', '/dealer'].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: route === '' ? 1.0 : 0.8,
    })
  );

  // Dynamic products
  let productRoutes: any[] = [];
  try {
    const productsRes = await serverFetch<any[]>('products/?page_size=200');
    const products = productsRes.data ?? [];
    if (Array.isArray(products)) {
      productRoutes = products.map((p: any) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: new Date(p.updated_at || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Sitemap products fetch failed:', e);
  }

  // Dynamic categories
  const categories = [
    'dental-handpieces',
    'intraoral-cameras',
    'led-light-cure-units',
    'dental-chairs',
    '3d-oral-scanners',
    'dental-air-compressors',
    'advanced-dental-equipment-accessories',
  ];
  const categoryRoutes = categories.map((slug) => ({
    url: `${baseUrl}/products/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic combos
  let comboRoutes: any[] = [];
  try {
    const combosRes = await serverFetch<any[]>('combos/');
    const combos = combosRes.data ?? [];
    if (Array.isArray(combos)) {
      comboRoutes = combos.map((c: any) => ({
        url: `${baseUrl}/combo-deals/${c.slug}`,
        lastModified: new Date(c.updated_at || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (e) {
    console.error('Sitemap combos fetch failed:', e);
  }

  // Dynamic published blog posts
  let blogRoutes: any[] = [];
  try {
    const blogRes = await serverFetch<any>('blog/?page_size=100');
    const blogPosts = blogRes?.data ?? [];
    if (Array.isArray(blogPosts)) {
      blogRoutes = blogPosts.map((post: any) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at || post.published_at || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Sitemap blog posts fetch failed:', e);
  }

  return [...routes, ...categoryRoutes, ...productRoutes, ...comboRoutes, ...blogRoutes];
}
