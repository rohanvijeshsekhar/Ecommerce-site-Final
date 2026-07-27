import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface SubSubCategory {
  id: string;
  slug: string;
  name: string;
}

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
  count: number;
  subItems: SubSubCategory[];
}

export interface Category {
  id: string;
  slug: string;
  icon: string;
  label: string;
  subCategories: SubCategory[];
}

export const CATEGORIES: Category[] = [];

const listeners = new Set<() => void>();
let isFetching = false;

export const notifyCategoriesChange = () => {
  listeners.forEach(l => l());
};

export const fetchCategoriesTree = () => {
  api.get('categories/tree/')
    .then(res => {
      const payload = res.data?.data ?? res.data ?? [];
      if (Array.isArray(payload) && payload.length > 0) {
        const mapped = payload.map((c: any) => ({
          id: c.id,
          slug: c.slug || c.id,
          icon: '📁',
          label: c.name,
          subCategories: (c.children || []).map((sub: any) => ({
            id: sub.id,
            slug: sub.slug || sub.id,
            name: sub.name,
            count: sub.active_product_count ?? (sub.children ? sub.children.length : 0),
            subItems: (sub.children || []).map((child: any) => ({
              id: child.id,
              slug: child.slug || child.id,
              name: child.name,
            })),
          })),
        }));
        CATEGORIES.length = 0;
        CATEGORIES.push(...mapped);
        notifyCategoriesChange();
      }
    })
    .catch(err => {
      console.error('Failed to load categories tree:', err);
    });
};

export const useCategories = () => {
  const [cats, setCats] = useState<Category[]>(CATEGORIES);
  useEffect(() => {
    const handleUpdate = () => setCats([...CATEGORIES]);
    listeners.add(handleUpdate);
    fetchCategoriesTree();
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);
  return cats;
};
