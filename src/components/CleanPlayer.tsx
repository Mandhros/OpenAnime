import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  RotateCw, 
  Tv, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Settings,
  X
} from 'lucide-react';

export interface CurrentPlayingEpisode {
  animeTitle: string;
  seasonName: string;
  episodeNumber: number;
  totalEpisodes: number;
  title: string;
  streamUrl?: string;
  embedUrl?: string;
  isDirectStream: boolean;
  playerName: string;
  mimeType?: string;
}

interface CleanPlayerProps {
  episode: CurrentPlayingEpisode | null;
  onNextEpisode: () => void;
  onPrevEpisode: () => void;
  hasNextEpisode: boolean;
  hasPrevEpisode: boolean;
  autoPlayNext: boolean;
  onToggleAutoPlayNext: (enabled: boolean) => void;
  onCastToTV: (url: string, title: string) => void;
  isCasting: boolean;
  connectedTVName?: string | null;
}

export const CleanPlayer: React.FC<CleanPlayerProps> = ({
  episode,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode,
  hasPrevEpisode,
  autoPlayNext,
  onToggleAutoPlayNext,
  onCastToTV,
  isCasting,
  connectedTVName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Compte à rebours avant épisode suivant
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Annuler le compte à rebours
  const cancelNextCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setNextCountdown(null);
  };

  // Déclencher le passage à l'épisode suivant
  const triggerAutoNext = () => {
    cancelNextCountdown();
    if (hasNextEpisode) {
      onNextEpisode();
    }
  };

  // Chargement du flux vidéo (HLS ou MP4)
  useEffect(() => {
    const video = videoRef.current;
    cancelNextCountdown();
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!video || !episode) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (episode.isDirectStream && episode.streamUrl) {
      const stream = episode.streamUrl;
      const isHls = stream.includes('.m3u8') || episode.mimeType?.includes('mpegurl');

      if (isHls) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;

          hls.loadSource(stream);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().then(() => setIsPlaying(true)).catch(e => console.log('Autoplay suspendu:', e));
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                setError("Échec de lecture du flux HLS.");
                hls.destroy();
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = stream;
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          setError("Ce navigateur ne prend pas en charge la lecture HLS.");
        }
      } else {
        // Direct MP4
        video.src = stream;
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }

    return () => {
      cancelNextCountdown();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [episode?.streamUrl, episode?.embedUrl, episode?.isDirectStream]);

  // Synchronisation temporelle et détection de fin
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (!isNaN(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
  };

  // Fin de l'épisode -> Enchaînement automatique
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoPlayNext && hasNextEpisode) {
      setNextCountdown(5);
      countdownTimerRef.current = setInterval(() => {
        setNextCountdown(prev => {
          if (prev === null || prev <= 1) {
            triggerAutoNext();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (video) {
      video.currentTime = target;
    }
  };

  const handleSeekRelative = (delta: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + delta));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolume = (val: number) => {
    const video = videoRef.current;
    setVolume(val);
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(video.muted);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    setPlaybackSpeed(speed);
    if (video) {
      video.playbackRate = speed;
    }
  };

  const handleFullscreen = () => {
    const container = document.getElementById('cleanPlayerWrapper');
    if (container && container.requestFullscreen) {
      container.requestFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!episode) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-500">
        <Play className="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-300">Aucun épisode sélectionné</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Choisissez un épisode dans la liste ci-dessous pour lancer la lecture directe sans publicité.
        </p>
      </div>
    );
  }

  return (
    <div id="cleanPlayerWrapper" className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl space-y-0">
      
      {/* En-tête du lecteur avec titre, badges et cast */}
      <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm text-white truncate">
              {episode.animeTitle}
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs text-blue-400 font-medium">
              {episode.seasonName}
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs text-amber-300 font-semibold font-mono">
              Épisode {episode.episodeNumber} / {episode.totalEpisodes}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Zéro Pub / Popups Bloqués</span>
            </span>

            <span className="text-[10px] text-slate-400 font-mono">
              Source : {episode.playerName}
            </span>
          </div>
        </div>

        {/* Boutons d'action : Cast TV + Enchaînement automatique */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Enchaînement automatique (Point 5) */}
          <button
            onClick={() => onToggleAutoPlayNext(!autoPlayNext)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              autoPlayNext
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
            title="Passe automatiquement à l'épisode suivant à la fin"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Lecture continue</span>
          </button>

          {/* Bouton Cast TV direct */}
          <button
            onClick={() => {
              const targetUrl = episode.streamUrl || episode.embedUrl || '';
              onCastToTV(targetUrl, `${episode.animeTitle} - Épisode ${episode.episodeNumber}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
              isCasting
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isCasting ? `Casting sur ${connectedTVName || 'TV'}` : 'Diffuser TV'}</span>
          </button>
        </div>
      </div>

      {/* Cadre du Lecteur Vidéo */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center group overflow-hidden">
        
        {/* Cas A : Stream direct extrait (Sendvid MP4 ou Vidmoly HLS) -> 100% propre dans notre lecteur HTML5 */}
        {episode.isDirectStream && episode.streamUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Notification de compte à rebours épisode suivant */}
            {nextCountdown !== null && (
              <div className="absolute top-4 right-4 z-30 bg-slate-900/95 border border-blue-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <div className="text-xs font-semibold text-white">Épisode suivant dans {nextCountdown}s...</div>
                  <div className="text-[10px] text-slate-400">Épisode {episode.episodeNumber + 1}</div>
                </div>
                <button
                  onClick={triggerAutoNext}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  Passer
                </button>
                <button
                  onClick={cancelNextCountdown}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Annuler"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Barre de contrôles personnalisée */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 space-y-2 opacity-95 group-hover:opacity-100 transition-opacity">
              
              {/* Barre de progression temporelle */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.5"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-blue-500 h-1.5 bg-slate-700/80 rounded-lg cursor-pointer"
                />
              </div>

              {/* Boutons de commandes */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Précédent */}
                  <button
                    onClick={onPrevEpisode}
                    disabled={!hasPrevEpisode}
                    className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Épisode précédent"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Recul 10s */}
                  <button
                    onClick={() => handleSeekRelative(-10)}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors hidden sm:block"
                    title="-10 secondes"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Lecture / Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    title={isPlaying ? "Pause" : "Lecture"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>

                  {/* Avance 10s */}
                  <button
                    onClick={() => handleSeekRelative(10)}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors hidden sm:block"
                    title="+10 secondes"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Suivant */}
                  <button
                    onClick={onNextEpisode}
                    disabled={!hasNextEpisode}
                    className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Épisode suivant"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Horloge */}
                  <div className="font-mono text-[11px] text-slate-300 ml-1">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-slate-500"> / </span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Sélecteur de vitesse de lecture */}
                  <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
                    {[1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-1.5 py-0.5 rounded ${
                          playbackSpeed === speed
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 text-slate-300 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolume(parseFloat(e.target.value))}
                      className="w-16 accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer hidden md:block"
                    />
                  </div>

                  {/* Plein écran */}
                  <button
                    onClick={handleFullscreen}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors"
                    title="Plein écran"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </>
        ) : (
          /* Cas B : Lecteur Sandbox Anti-Popups (bloque window.open, popups, redirects) */
          <div className="w-full h-full relative bg-slate-950">
            <iframe
              src={episode.embedUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}

        {/* Message d'erreur s'il y a lieu */}
        {error && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-20">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-medium text-rose-300 max-w-sm">{error}</p>
            <p className="text-xs text-slate-400 mt-1">
              Vous pouvez basculer sur un autre lecteur en un clic dans la liste des lecteurs.
            </p>
          </div>
        )}
      </div>

      {/* Barre d'accès rapide sous le lecteur */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevEpisode}
            disabled={!hasPrevEpisode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Épisode précédent</span>
          </button>

          <button
            onClick={onNextEpisode}
            disabled={!hasNextEpisode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 disabled:opacity-30 disabled:pointer-events-none transition-colors font-medium"
          >
            <span>Épisode suivant</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{autoPlayNext ? '✓ Enchaînement actif' : 'Enchaînement désactivé'}</span>
        </div>
      </div>

    </div>
  );
};
