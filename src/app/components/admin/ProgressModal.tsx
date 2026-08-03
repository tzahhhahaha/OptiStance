import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ProgressModalProps {
  athleteId: string;
  onClose: () => void;
}

export function ProgressModal({ athleteId, onClose }: ProgressModalProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    try {
      const rawSessions = window.localStorage.getItem('optistance-sessions') || '[]';
      const rawLogs = window.localStorage.getItem('optistance-logs') || '[]';
      const parsedSessions = JSON.parse(rawSessions) as any[];
      const parsedLogs = JSON.parse(rawLogs) as any[];
      const athleteSessions = parsedSessions.filter((s) => s.userId === athleteId);
      setSessions(athleteSessions);
      const sessionIds = athleteSessions.map((s) => s.id);
      const athleteLogs = parsedLogs.filter((l) => sessionIds.includes(l.sessionId));
      setLogs(athleteLogs);
    } catch (e) {
      setSessions([]);
      setLogs([]);
    }
  }, [athleteId]);

  const totalSessions = sessions.length;
  const overallAccuracy = totalSessions === 0 ? 0 : Math.round((logs.reduce((acc, l) => acc + (l.score || 0), 0) / (logs.length || 1)) * 100) / 100;

  const breakdown: Record<string, { attempts: number; avg: number }> = {};
  logs.forEach((l) => {
    const m = l.motionId || 'unknown';
    if (!breakdown[m]) breakdown[m] = { attempts: 0, avg: 0 };
    breakdown[m].attempts += 1;
    breakdown[m].avg += l.score || 0;
  });
  Object.keys(breakdown).forEach((k) => {
    breakdown[k].avg = Math.round((breakdown[k].avg / breakdown[k].attempts) * 100) / 100;
  });

  const handleImpersonate = () => {
    try {
      window.localStorage.setItem('optistance_impersonate', athleteId);
      // signal to other tabs / app
      window.dispatchEvent(new Event('optistance:impersonate'));
      // optional redirect to home
      window.location.href = window.location.pathname;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Athlete Progress</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-purple-50 p-4 text-center">
            <div className="text-sm text-gray-500">Total Sessions</div>
            <div className="text-2xl font-bold text-purple-700">{totalSessions}</div>
          </div>
          <div className="rounded-xl bg-purple-50 p-4 text-center">
            <div className="text-sm text-gray-500">Overall Accuracy</div>
            <div className="text-2xl font-bold text-purple-700">{overallAccuracy}%</div>
          </div>
          <div className="rounded-xl bg-purple-50 p-4 text-center">
            <div className="text-sm text-gray-500">Distinct Stances</div>
            <div className="text-2xl font-bold text-purple-700">{Object.keys(breakdown).length}</div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium mb-2">Stance Breakdown</h4>
          <div className="space-y-2 max-h-56 overflow-auto">
            {Object.entries(breakdown).length === 0 ? (
              <div className="text-sm text-gray-500">No stance data available.</div>
            ) : (
              Object.entries(breakdown).map(([motionId, data]) => (
                <div key={motionId} className="rounded-xl border border-purple-100 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{motionId}</div>
                    <div className="text-sm text-gray-500">Avg: {data.avg}% • {data.attempts} attempts</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-end">
          <button onClick={handleImpersonate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">View as user</button>
          <button onClick={onClose} className="rounded-xl border border-purple-100 px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
