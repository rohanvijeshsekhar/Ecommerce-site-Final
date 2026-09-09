import type { Metadata } from 'next';
import { serverFetch } from '../../../lib/server-api';
import SolutionsClient from './SolutionsClient';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Clinical Solutions & Procedure Kits | FAAZO Dental',
  description: 'Explore curated clinical solutions, procedural kits, and dental equipment workflows for specialized practices.',
};

export default async function SolutionsPage() {
  const res = await serverFetch<any[]>('solutions/', { revalidate });
  const solutions = res.data || [];

  return <SolutionsClient initialSolutions={solutions} />;
}
