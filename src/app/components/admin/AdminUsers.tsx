import React, { useEffect, useState } from 'react';
import { listUsers, setUserDisabled } from '../../../styles/services/adminService';

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const u = await listUsers();
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleDisabled = async (id: string, current: boolean) => {
    await setUserDisabled(id, !current);
    fetchUsers();
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Users</h3>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-2">
          {users.length === 0 && <div className="text-sm text-gray-500">No users found in Firestore 'users' collection.</div>}
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{u.displayName || u.email || u.id}</div>
                <div className="text-xs text-gray-500">{u.email || 'no-email'}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm">{u.disabled ? 'Disabled' : 'Active'}</div>
                <button onClick={() => toggleDisabled(u.id, !!u.disabled)} className="px-2 py-1 bg-gray-100 rounded">{u.disabled ? 'Enable' : 'Disable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
