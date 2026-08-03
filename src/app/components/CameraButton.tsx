import { Camera } from 'lucide-react';

interface CameraButtonProps {
  onClick: () => void;
}

export function CameraButton({ onClick }: CameraButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-6 w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full shadow-xl flex items-center justify-center text-white hover:shadow-2xl hover:scale-105 transition-all z-50 border-4 border-white"
      aria-label="Open Camera"
    >
      <Camera className="w-7 h-7" />
    </button>
  );
}
