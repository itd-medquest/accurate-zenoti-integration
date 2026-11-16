'use client';

import { ArrowRight, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function CommandComingSoon({ onDashboard }: { onDashboard: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 sm:py-20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChartNoAxesCombined />
            </EmptyMedia>
            <Badge variant="secondary">Command</Badge>
            <EmptyTitle>Coming soon</EmptyTitle>
            <EmptyDescription>
              Dashboard eksekutif sedang disiapkan untuk membantu Anda melihat kinerja bisnis dalam
              satu tempat.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onDashboard}>
              Buka Easy Recap <ArrowRight data-icon="inline-end" />
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
