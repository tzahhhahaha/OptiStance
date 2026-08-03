import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getMotions, updateMotionThresholds, type Motion } from '../../services/api';

export function MotionConfig() {
  const [motions, setMotions] = useState<Motion[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshMotions = async () => {
    const nextMotions = await getMotions();
    setMotions(nextMotions);
  };

  useEffect(() => {
    void refreshMotions();
  }, []);

  const handleFieldChange = (motionId: string, field: keyof Motion, value: string) => {
    setMotions((current) => current.map((motion) => (motion.id === motionId ? { ...motion, [field]: field === 'motionName' || field === 'description' ? value : Number(value) } : motion)));
  };

  const handleSave = async (motionId: string) => {
    setBusy(true);
    setMessage('');
    try {
      const motion = motions.find((entry) => entry.id === motionId);
      if (!motion) return;
      await updateMotionThresholds(motionId, {
        minShoulderAngle: motion.minShoulderAngle,
        maxShoulderAngle: motion.maxShoulderAngle,
        minElbowAngle: motion.minElbowAngle,
        maxElbowAngle: motion.maxElbowAngle,
        description: motion.description,
      });
      setMessage(`${motion.motionName} thresholds updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update motion thresholds.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 pb-24 bg-gradient-to-b from-purple-50 to-white min-h-screen">
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-5 text-white shadow-lg">
        <p className="text-sm text-purple-100">System Manager workspace</p>
        <h1 className="mt-1 text-2xl font-semibold">Pose Thresholds</h1>
      </div>

      <div className="space-y-4">
        {motions.map((motion) => (
          <div key={motion.id} className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">{motion.motionName}</h2>
                <p className="text-sm text-gray-500">{motion.description}</p>
              </div>
              <button
                onClick={() => void handleSave(motion.id)}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-gray-600">
                <span className="mb-1 block">Min shoulder angle</span>
                <input
                  type="number"
                  value={motion.minShoulderAngle}
                  onChange={(event) => handleFieldChange(motion.id, 'minShoulderAngle', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </label>
              <label className="text-sm text-gray-600">
                <span className="mb-1 block">Max shoulder angle</span>
                <input
                  type="number"
                  value={motion.maxShoulderAngle}
                  onChange={(event) => handleFieldChange(motion.id, 'maxShoulderAngle', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </label>
              <label className="text-sm text-gray-600">
                <span className="mb-1 block">Min elbow angle</span>
                <input
                  type="number"
                  value={motion.minElbowAngle}
                  onChange={(event) => handleFieldChange(motion.id, 'minElbowAngle', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </label>
              <label className="text-sm text-gray-600">
                <span className="mb-1 block">Max elbow angle</span>
                <input
                  type="number"
                  value={motion.maxElbowAngle}
                  onChange={(event) => handleFieldChange(motion.id, 'maxElbowAngle', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm text-gray-600">
              <span className="mb-1 block">Description</span>
              <textarea
                value={motion.description}
                onChange={(event) => handleFieldChange(motion.id, 'description', event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </label>
          </div>
        ))}
      </div>

      {message ? <p className="mt-4 text-sm text-purple-700">{message}</p> : null}
    </div>
  );
}
