import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Tv, PowerOff } from 'lucide-react';
import { CastStatus } from '../hooks/useGoogleCast';

interface CastRemoteProps {
  status: CastStatus;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onDisconnect: () => void;
}

export const CastRemote: React.FC<CastRemoteProps> = ({
  status,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onDisconnect,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-600/40 p-5 shadow-2xl relative overflow-hidden">
      {/* Glow décoratif subtil */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

      {/* En-tête télécommande */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-blue-400 font-medium">Diffusion active sur TV</div>
            <div className="text-sm font-semibold text-slate-100">
              {status.connectedDeviceName || 'Chromecast'}
            </div>
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
          title="Arrêter la diffusion"
        >
          <PowerOff className="w-3.5 h-3.5" />
          <span>Déconnecter</span>
        </button>
      </div>

      {/* Titre du média en cours */}
      <div className="mb-4">
        <div className="text-xs text-slate-400">Titre en lecture :</div>
        <div className="text-sm font-medium text-slate-200 truncate mt-0.5">
          {status.currentMediaTitle || 'Flux multimédia en cours'}
        </div>
      </div>

      {/* Barre de progression temporelle */}
      {status.duration > 0 && (
        <div className="space-y-1.5 mb-5">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>{formatTime(status.currentTime)}</span>
            <span>{formatTime(status.duration)}</span>
          </div>
        </div>
      )}

      {/* Boutons de contrôle (Thumb-zone ergonomique) */}
      <div className="flex items-center justify-center gap-5 my-2">
        <button
          onClick={() => onSeek(-10)}
          className="w-11 h-11 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 flex items-center justify-center text-slate-200 active:scale-90 transition-transform"
          title="Reculer de 10 secondes"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-transform"
          title={status.isPaused ? "Lecture sur la TV" : "Pause sur la TV"}
        >
          {status.isPaused ? (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          ) : (
            <Pause className="w-6 h-6 fill-white" />
          )}
        </button>

        <button
          onClick={() => onSeek(10)}
          className="w-11 h-11 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 flex items-center justify-center text-slate-200 active:scale-90 transition-transform"
          title="Avancer de 10 secondes"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Contrôle du Volume TV */}
      <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center gap-3">
        <button
          onClick={onToggleMute}
          className="text-slate-400 hover:text-slate-200 transition-colors"
          title={status.isMuted ? "Rétablir le son" : "Couper le son TV"}
        >
          {status.isMuted || status.volumeLevel === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={status.isMuted ? 0 : status.volumeLevel}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400 w-8 text-right">
            {Math.round((status.isMuted ? 0 : status.volumeLevel) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
