import { type ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <Card padding="md" shadow="card">
      {children}
    </Card>
  );
}
