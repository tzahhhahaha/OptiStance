import React, { useEffect, useState } from 'react';
import { listAnalytics } from '../../../styles/services/adminService';

export function AdminAnalytics() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const a = await listAnalytics();
    setItems(a);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <h3 className="font-semibold mb-3">Analytics</h3>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-2 text-sm text-gray-700">
          {items.length === 0 && <div className="text-gray-500">No analytics data.</div>}
          {items.map((it) => (
            <div key={it.id} className="p-2 border rounded">
              <div className="text-xs text-gray-500">{new Date(it.timestamp?.seconds ? it.timestamp.seconds * 1000 : Date.now()).toLocaleString()}</div>
              <div className="text-sm">{it.event}: {it.detail || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminAnalytics;
