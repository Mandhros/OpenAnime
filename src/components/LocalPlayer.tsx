import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle } from 'lucide-react';

interface LocalPlayerProps {
  url: string;
  isPlaying: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

export const LocalPlayer: React.FC<LocalPlayerProps> = ({ url, isPlaying, onPlayStateChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const getMimeType = (mediaUrl: string) => {
    const clean = mediaUrl.split('?')[0].toLowerCase();
    if (clean.endsWith('.m3u8')) return 'hls';
    if (clean.endsWith('.webm')) return 'webm';
    return 'mp4';
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError(null);
    const mediaType = getMimeType(url);

    // Nettoyer l'instance HLS existante
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (mediaType === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isPlaying) {
            video.play().catch(e => console.log('Autoplay bloqué:', e));
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError("Erreur réseau HLS ou restriction CORS sur le flux .m3u8.");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError("Erreur de décodage du flux multimédia HLS.");
                hls.recoverMediaError();
                break;
              default:
                setError("Impossible de charger le flux HLS.");
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari iOS natif
        video.src = url;
        if (isPlaying) {
          video.play().catch(() => {});
        }
      } else {
        setError("Votre navigateur ne supporte pas la lecture de flux HLS.");
      }
    } else {
      // MP4 / WebM standard
      video.src = url;
      if (isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsVideoPlaying(true);
        onPlayStateChange?.(true);
      }).catch(() => {});
    } else {
      video.pause();
      setIsVideoPlaying(false);
      onPlayStateChange?.(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(video.muted);
    }
  };

  const handleFullScreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl aspect-video flex items-center justify-center group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onPlay={() => {
          setIsVideoPlaying(true);
          onPlayStateChange?.(true);
        }}
        onPause={() => {
          setIsVideoPlaying(false);
          onPlayStateChange?.(false);
        }}
        onError={() => {
          setError("Échec de chargement de la vidéo. Vérifiez l'URL et l'autorisation CORS.");
        }}
      />

      {/* Message d'erreur */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-sm font-medium text-rose-300 max-w-sm">{error}</p>
          <span className="text-xs text-slate-400 mt-2">
            Astuce : Chromecast peut parfois lire le flux même si la prévisualisation locale est bloquée par la politique CORS de votre navigateur.
          </span>
        </div>
      )}

      {/* Placeholder si aucune URL */}
      {!url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-500 bg-slate-900/40">
          <Play className="w-10 h-10 mb-2 stroke-[1.5] text-slate-600" />
          <p className="text-xs font-medium">Collez une URL de vidéo ci-dessus et appuyez sur « Prévisualiser »</p>
        </div>
      )}

      {/* Barre de contrôle personnalisée superposée */}
      {url && !error && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between text-white transition-opacity">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center text-white transition-transform active:scale-90"
              title={isVideoPlaying ? "Pause" : "Lecture"}
            >
              {isVideoPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-slate-300 hover:text-white transition-colors"
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer hidden sm:block"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-300">
              {getMimeType(url).toUpperCase()}
            </span>
            <button
              onClick={handleFullScreen}
              className="p-1.5 text-slate-300 hover:text-white transition-colors"
              title="Plein écran"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
