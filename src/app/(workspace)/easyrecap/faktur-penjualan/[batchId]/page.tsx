import { notFound } from 'next/navigation';
import { validRouteIdentifier } from '@/lib/workspace-navigation';

export default async function Page({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  if (!validRouteIdentifier(batchId)) notFound();
  return null;
}
