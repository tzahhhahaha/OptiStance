import React, { useEffect, useState } from 'react';
import { listUploads, deleteUpload } from '../../../styles/services/adminService';

export function AdminContent() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const u = await listUploads();
    setUploads(u);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id: string, path?: string) => {
    if (!confirm('Delete this upload?')) return;
    await deleteUpload(id, path);
    fetch();
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Uploads</h3>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-3">
          {uploads.length === 0 && <div className="text-sm text-gray-500">No uploads found.</div>}
          {uploads.map((u) => (
            <div key={u.id} className="p-3 border rounded flex items-start gap-3">
              <img src={u.url} alt={u.name} className="w-20 h-20 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{new Date(u.createdAt?.seconds ? u.createdAt.seconds * 1000 : Date.now()).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleDelete(u.id, u.path)} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
                <a href={u.url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-gray-100 rounded text-sm">Open</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminContent;
