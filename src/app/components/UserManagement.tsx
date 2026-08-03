import { useEffect, useState } from 'react';
import { PlusCircle, Trash2, UserRound, Eye } from 'lucide-react';
import { createAthlete, deleteUser, getUsers, type User, createUser, toggleUserActive } from '../../services/api';
import { ProgressModal } from './admin/ProgressModal';
import { AccountForm } from './admin/AccountForm';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showProgressFor, setShowProgressFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshUsers = async () => {
    const nextUsers = await getUsers();
    setUsers(nextUsers.filter((user) => user.role === 'Athlete' || user.role === 'SystemManager'));
  };

  useEffect(() => {
    void refreshUsers();
  }, []);

  const handleCreateAthlete = async (fullName: string, email: string, password: string) => {
    setBusy(true);
    try {
      await createAthlete(fullName, email, password || 'optistance123');
      await refreshUsers();
      setMessage('Athlete account created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create athlete.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setBusy(true);
    try {
      await deleteUser(userId);
      await refreshUsers();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = async (fullName: string, email: string, password: string, role: string) => {
    setBusy(true);
    try {
      await createUser(fullName, email, password || 'optistance123', role === 'SystemManager' ? 'SystemManager' : 'Athlete');
      await refreshUsers();
      setMessage('Account created.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  };

  const handleImpersonate = (userId: string) => {
    try {
      // Set impersonation flag and notify the app without forcing a reload.
      window.localStorage.setItem('optistance_impersonate', userId);
      window.dispatchEvent(new Event('optistance:impersonate'));
      setMessage('Impersonation enabled. You are now viewing the app as this athlete.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (userId: string) => {
    setBusy(true);
    try {
      await toggleUserActive(userId);
      await refreshUsers();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 pb-24 min-h-screen">
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-5 text-white shadow-lg">
        <p className="text-sm text-purple-100">System Manager workspace</p>
        <h1 className="mt-1 text-2xl font-semibold">Athlete Accounts</h1>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold text-gray-800">Create account</h2>
          </div>
          <AccountForm onSaved={async () => { await refreshUsers(); }} />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Quick create (Athlete)</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget as HTMLFormElement);
              const fullName = String(data.get('fullname') || '');
              const email = String(data.get('email') || '');
              const password = String(data.get('password') || 'optistance123');
              void handleCreateAthlete(fullName, email, password);
            }}
            className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <input name="fullname" placeholder="Full name" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" required />
              <input name="email" type="email" placeholder="Email" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" required />
              <input name="password" type="password" placeholder="Password" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="submit" disabled={busy} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-70">Create athlete</button>
              {message ? <p className="text-sm text-purple-700">{message}</p> : null}
            </div>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
        <div className="border-b border-purple-100 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800">Registered accounts</div>
        <div className="divide-y divide-purple-100">
          {users.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No accounts yet.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setShowProgressFor(user.id)} className="rounded-full p-2 text-gray-500 hover:bg-purple-50" title="View progress">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleImpersonate(user.id)} className="rounded-full p-2 text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 text-sm">View as user</button>
                  <button onClick={() => void handleDelete(user.id)} className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600" title="Delete account">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showProgressFor ? <ProgressModal athleteId={showProgressFor} onClose={() => setShowProgressFor(null)} /> : null}
    </div>
  );
}
