import { notFound } from 'next/navigation';
import { validRouteIdentifier } from '@/lib/workspace-navigation';

export default async function Page({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params;
  if (!validRouteIdentifier(receiptId)) notFound();
  return null;
}
