'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AccurateMasterPicker } from '@/features/easyrecap/invoices/components/accurate-master-picker';
import {
  getAccurateStatus,
  saveAccurateDestination,
} from '@/features/easyrecap/invoices/services/accurate.service';
import type { AccurateStatus } from '@/features/easyrecap/invoices/types/accurate';
import type { Branch } from '@/types';
import { Building2 } from 'lucide-react';
export function AccurateDestinations({ branches }: { branches: Branch[] }) {
  const branchId = branches[0]?.id;
  const [status, setStatus] = useState<AccurateStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getAccurateStatus(branchId)
      .then(setStatus)
      .catch((error) => setError(error.message));
  }, [branchId]);
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Tujuan Faktur Penjualan aktual</CardTitle>
          <CardDescription>
            Perusahaan/database mengikuti API Token tersimpan. Tujuan terkunci setelah digunakan
            untuk pengiriman aktual.
          </CardDescription>
        </div>
        <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pb-5">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!status && !error && <p role="status">Memuat mapping cabang…</p>}
        {status &&
          branches
            .filter((branch) => branch.active)
            .map((branch) => {
              const destination = status.destinations.find(
                (destination) => destination.branchId === branch.id,
              );
              return (
                <div key={branch.id} className="flex min-w-0 flex-col gap-3">
                  {destination && (
                    <p className="text-sm text-muted-foreground">
                      Database: {destination.databaseName} ({destination.databaseId})
                    </p>
                  )}
                  <AccurateMasterPicker
                    branchId={branch.id}
                    kind="branch"
                    label={`${branch.name} → Tujuan Accurate`}
                    selected={
                      destination
                        ? { code: destination.targetBranchId, name: destination.targetBranchName }
                        : undefined
                    }
                    onSelect={async (id) => setStatus(await saveAccurateDestination(branch.id, id))}
                  />
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
