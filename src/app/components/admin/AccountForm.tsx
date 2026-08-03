import { useState } from 'react';
import { createUser, updateUser, resetPassword, type User, type UserRole } from '../../../services/api';

interface AccountFormProps {
  existing?: User | null;
  onSaved?: (user: User) => void;
}

export function AccountForm({ existing = null, onSaved }: AccountFormProps) {
  const [fullName, setFullName] = useState(existing?.fullName ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(existing?.role ?? 'Athlete');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (existing) {
        const updated = await updateUser(existing.id, {
          fullName,
          email,
          role,
        });
        if (password) await resetPassword(existing.id, password);
        onSaved?.(updated);
        setMessage('Account updated.');
      } else {
        const created = await createUser(fullName, email, password || 'optistance123', role);
        onSaved?.(created);
        setFullName('');
        setEmail('');
        setPassword('');
        setMessage('Account created.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3 mb-3">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" required />
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="Athlete">Athlete</option>
          <option value="SystemManager">System Manager</option>
        </select>
      </div>

      <div className="mb-3">
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (leave blank to keep)" type="password" className="rounded-xl border border-gray-200 px-3 py-2 text-sm w-full" />
      </div>

      <div className="flex items-center gap-3">
        <button disabled={busy} type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-70">{existing ? 'Save' : 'Create'}</button>
        {message ? <div className="text-sm text-purple-700">{message}</div> : null}
      </div>
    </form>
  );
}
