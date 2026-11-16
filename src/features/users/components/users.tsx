'use client';
import { Loading, Modal } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '@/features/users/services/users.service';
import { cn } from '@/lib/cn';
import { dateOnly } from '@/lib/format';
import { roleLabels } from '@/lib/labels';
import { type Actor } from '@/types';
import { LoaderCircle, Pencil, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
export function UsersView({
  actor,
  run,
}: {
  actor: Actor;
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  const [users, setUsers] = useState<Actor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Actor | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Actor | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      await run(async () => {
        await deleteUser(target.id);
        setUsers((current) => current.filter((value) => value.id !== target.id));
        setDeleteTarget(null);
      }, 'Pengguna berhasil dihapus.');
    } finally {
      setDeleting(false);
    }
  }
  const load = useCallback(async () => {
    setUsers(await listUsers());
    setLoaded(true);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  if (error)
    return (
      <Alert
        className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
        variant="destructive"
      >
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  return (
    <>
      <div className="user-summary flex items-center gap-3.25 mb-6 p-5.5 bg-accent/60 border border-solid border-border rounded-[12px] mobile:p-4 mobile:gap-2.25 mobile:flex-wrap">
        <div className="user-summary-icon text-[#9a86c7] bg-accent/60 p-2.75 rounded-[10px] flex">
          <Users size={23} />
        </div>
        <div>
          <strong>{users.length} anggota ruang kerja</strong>
          <p>{users.filter((u) => u.active).length} aktif · Akses dikelola administrator</p>
        </div>
        <Button
          className="button inline-flex items-center justify-center whitespace-nowrap primary"
          onClick={() => setEditing('new')}
          variant="default"
        >
          <UserPlus size={16} data-icon="inline-start" /> Tambah pengguna
        </Button>
      </div>
      <Card className="panel overflow-hidden">
        <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
          <div>
            <CardTitle>Pengguna & hak akses</CardTitle>
            <CardDescription>Role diterapkan pada menu dan setiap tindakan API.</CardDescription>
          </div>
          <ShieldCheck size={20} />
        </CardHeader>
        <CardContent className="p-0">
          {!loaded ? (
            <Loading />
          ) : (
            <div className="table-scroll overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PENGGUNA</TableHead>
                    <TableHead>ROLE</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>TERDAFTAR</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi pengguna</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="user-cell flex gap-2.5 items-center">
                          <span className="avatar bg-muted/50 text-muted-foreground w-8.5 h-8.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <div>
                            <strong>
                              {u.name}{' '}
                              {u.id === actor.id && (
                                <small className="muted text-muted-foreground">(Anda)</small>
                              )}
                            </strong>
                            <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            `role-badge py-1.25 px-2 inline-flex items-center bg-muted/50 rounded-[5px] text-muted-foreground text-[10px] ${u.role}`,
                          )}
                        >
                          {roleLabels[u.role]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            `badge inline-flex items-center gap-1.25 rounded-[5px] whitespace-nowrap font-medium bg-muted/50 text-muted-foreground text-[10px] py-1.25 px-2 mobile:text-[9px] leading-[1.2] ${u.active ? 'synced' : 'pending'}`,
                          )}
                        >
                          <span className="status-dot w-1.25 h-1.25 inline-block [background:currentColor] rounded-full shrink-0" />
                          {u.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </TableCell>
                      <TableCell className="muted text-muted-foreground">
                        {u.createdAt ? dateOnly(u.createdAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            className="icon-button inline-flex items-center justify-center mobile:min-w-8.5"
                            disabled={u.id === actor.id || deleting}
                            onClick={() => setEditing(u)}
                            aria-label={`Edit pengguna ${u.name}`}
                            variant="ghost"
                            size="icon"
                          >
                            <Pencil size={16} data-icon="inline-start" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={u.id === actor.id || deleting}
                            aria-label={`Hapus pengguna ${u.name}`}
                            title={
                              u.id === actor.id
                                ? 'Akun sendiri tidak dapat dihapus'
                                : `Hapus pengguna ${u.name}`
                            }
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="panel overflow-hidden role-guide mt-5.5 p-5.5 mobile:p-4.5">
        <h2>Panduan role</h2>
        <div className="role-guide-grid grid grid-cols-[repeat(3,_1fr)] gap-6.25 mt-5 mobile:grid-cols-[1fr] mobile:gap-5.5">
          <div>
            <span className="role-badge py-1.25 px-2 inline-flex items-center bg-muted/50 rounded-[5px] text-muted-foreground text-[10px] super_admin">
              Super Admin
            </span>
            <p>Seluruh fitur, pengelolaan pengguna, koneksi, dan mapping cabang.</p>
          </div>
          <div>
            <span className="role-badge py-1.25 px-2 inline-flex items-center bg-muted/50 rounded-[5px] text-muted-foreground text-[10px] finance">
              Finance
            </span>
            <p>Dashboard, invoice, pengambilan data, sinkronisasi, retry, dan export.</p>
          </div>
          <div>
            <span className="role-badge py-1.25 px-2 inline-flex items-center bg-muted/50 rounded-[5px] text-muted-foreground text-[10px] viewer">
              Viewer
            </span>
            <p>Melihat dashboard dan detail invoice untuk monitoring operasional.</p>
          </div>
        </div>
      </Card>
      {editing && (
        <UserForm
          user={editing}
          onClose={() => setEditing(null)}
          run={run}
          saved={async () => {
            await load();
            setEditing(null);
          }}
        />
      )}
      {deleteTarget && (
        <Modal
          title="Hapus pengguna?"
          destructive
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div className="flex flex-col gap-5 p-6 mobile:p-4" aria-busy={deleting}>
            <div className="flex min-w-0 flex-col gap-1 wrap-anywhere">
              <strong>{deleteTarget.name}</strong>
              <span className="text-sm text-muted-foreground">{deleteTarget.email}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Akun akan dihapus permanen dan seluruh sesi login akan dicabut. Tindakan ini tidak
              dapat dibatalkan.
            </p>
            <p className="text-xs text-muted-foreground">
              Pengguna dengan riwayat upload perlu dinonaktifkan melalui Edit pengguna agar riwayat
              tetap tersimpan.
            </p>
            <div className="flex justify-end gap-2 mobile:flex-col-reverse">
              <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
                {deleting ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Trash2 data-icon="inline-start" />
                )}
                {deleting ? 'Menghapus...' : 'Ya, hapus pengguna'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function UserForm({
  user,
  onClose,
  run,
  saved,
}: {
  user: Actor | 'new';
  onClose: () => void;
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
  saved: () => Promise<void>;
}) {
  const isNew = user === 'new';
  const [name, setName] = useState(isNew ? '' : user.name);
  const [email, setEmail] = useState(isNew ? '' : user.email);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(isNew ? 'viewer' : user.role);
  const [active, setActive] = useState(isNew || user.active);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={isNew ? 'Tambah pengguna' : 'Edit akses pengguna'} onClose={onClose}>
      <form
        className="user-form p-5.75"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await run(
            async () => {
              if (isNew) await createUser({ name, email, password, role });
              else await updateUser(user.id, { role, active });
              await saved();
            },
            isNew ? 'Pengguna berhasil ditambahkan.' : 'Akses diperbarui dan sesi lama dicabut.',
          );
          setBusy(false);
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Nama
              <Input
                value={name}
                required
                minLength={2}
                disabled={!isNew}
                onChange={(e) => setName(e.target.value)}
              />
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Email
              <Input
                type="email"
                value={email}
                required
                disabled={!isNew}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldLabel>
          </Field>
          {isNew && (
            <Field>
              <FieldLabel className="flex w-full flex-col items-stretch gap-2">
                Password awal
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="field-help font-normal -mt-1.75 text-[10px] text-muted-foreground leading-[1.8]">
                  Minimal 12 karakter. Bagikan kepada pengguna melalui saluran internal.
                </span>
              </FieldLabel>
            </Field>
          )}
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Role
              <SelectField value={role} onValueChange={(e) => setRole(e)}>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectFieldOption key={value} value={value}>
                    {label}
                  </SelectFieldOption>
                ))}
              </SelectField>
            </FieldLabel>
          </Field>
          {!isNew && (
            <Field className="checkbox-label flex-row items-center gap-2 font-normal text-[11px]">
              <FieldLabel className="flex w-full flex-col items-stretch gap-2">
                <Checkbox
                  checked={active}
                  onCheckedChange={(checked) => setActive(checked === true)}
                />{' '}
                Akun aktif
              </FieldLabel>
            </Field>
          )}
          <div className="form-actions flex justify-end gap-2.25 mt-1.25">
            <Button
              type="button"
              className="button inline-flex items-center justify-center whitespace-nowrap secondary"
              onClick={onClose}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap primary"
              disabled={busy}
              variant="default"
            >
              Simpan pengguna
            </Button>
          </div>
        </FieldGroup>
      </form>
    </Modal>
  );
}
