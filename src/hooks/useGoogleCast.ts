import { useEffect, useState, useRef, useCallback } from 'react';

export interface CastStatus {
  isCastAvailable: boolean;
  isConnected: boolean;
  connectedDeviceName: string | null;
  isMediaLoaded: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volumeLevel: number;
  isMuted: boolean;
  currentMediaTitle: string | null;
}

export function useGoogleCast() {
  const [status, setStatus] = useState<CastStatus>({
    isCastAvailable: false,
    isConnected: false,
    connectedDeviceName: null,
    isMediaLoaded: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volumeLevel: 1,
    isMuted: false,
    currentMediaTitle: null,
  });

  const castContextRef = useRef<any>(null);
  const remotePlayerRef = useRef<any>(null);
  const remotePlayerControllerRef = useRef<any>(null);

  // Détection du type de contenu
  const getContentType = (url: string) => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.m3u8')) return 'application/x-mpegurl';
    if (cleanUrl.endsWith('.mpd')) return 'application/dash+xml';
    if (cleanUrl.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  };

  const syncPlayerState = useCallback(() => {
    const player = remotePlayerRef.current;
    const session = castContextRef.current?.getCurrentSession();

    if (player) {
      setStatus(prev => ({
        ...prev,
        isConnected: Boolean(player.isConnected),
        connectedDeviceName: session?.getCastDevice()?.friendlyName || (player.isConnected ? 'Chromecast' : null),
        isMediaLoaded: Boolean(player.isMediaLoaded),
        isPaused: Boolean(player.isPaused),
        currentTime: player.currentTime || 0,
        duration: player.duration || 0,
        volumeLevel: typeof player.volumeLevel === 'number' ? player.volumeLevel : 1,
        isMuted: Boolean(player.isMuted),
        currentMediaTitle: player.title || prev.currentMediaTitle,
      }));
    }
  }, []);

  const initializeCast = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.cast && window.cast.framework) {
        const context = window.cast.framework.CastContext.getInstance();
        castContextRef.current = context;

        context.setOptions({
          receiverApplicationId: window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
          autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'ORIGIN_SCOPED',
        });

        const player = new window.cast.framework.RemotePlayer();
        const controller = new window.cast.framework.RemotePlayerController(player);
        remotePlayerRef.current = player;
        remotePlayerControllerRef.current = controller;

        // Écouteurs d'événements
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.DURATION_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
          syncPlayerState
        );
        controller.addEventListener(
          window.cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED,
          syncPlayerState
        );

        setStatus(prev => ({
          ...prev,
          isCastAvailable: true,
          isConnected: Boolean(player.isConnected),
        }));
      }
    } catch (e) {
      console.warn('Initialisation Cast SDK:', e);
    }
  }, [syncPlayerState]);

  useEffect(() => {
    // Si l'API est déjà prête
    if (window.cast && window.cast.framework) {
      initializeCast();
    } else {
      // Définir le callback officiel attendu par cast_sender.js
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          initializeCast();
        } else {
          setStatus(prev => ({ ...prev, isCastAvailable: false }));
        }
      };
    }
  }, [initializeCast]);

  const requestSession = async () => {
    if (!castContextRef.current) return false;
    try {
      await castContextRef.current.requestSession();
      syncPlayerState();
      return true;
    } catch (e) {
      console.log('Demande de session annulée/échouée:', e);
      return false;
    }
  };

  const endSession = (stopCasting = true) => {
    if (castContextRef.current) {
      castContextRef.current.endCurrentSession(stopCasting);
      syncPlayerState();
    }
  };

  const loadMedia = async (url: string, customTitle?: string) => {
    if (!url) return false;
    if (!castContextRef.current) {
      throw new Error("Le SDK Google Cast n'est pas encore initialisé.");
    }

    let session = castContextRef.current.getCurrentSession();
    if (!session) {
      const connected = await requestSession();
      if (!connected) return false;
      session = castContextRef.current.getCurrentSession();
    }

    if (!session) return false;

    const chromeCast = (window as any).chrome?.cast;
    if (!chromeCast) {
      throw new Error("L'API Chrome Cast n'est pas encore prête.");
    }

    const mimeType = getContentType(url);
    const mediaInfo = new chromeCast.media.MediaInfo(url, mimeType);
    mediaInfo.metadata = new chromeCast.media.GenericMediaMetadata();
    
    const parsedName = url.split('/').pop()?.split('?')[0] || 'Vidéo Externe';
    const finalTitle = customTitle || decodeURIComponent(parsedName);
    mediaInfo.metadata.title = finalTitle;
    mediaInfo.metadata.subtitle = mimeType.toUpperCase();

    const request = new chromeCast.media.LoadRequest(mediaInfo);
    request.autoplay = true;

    try {
      await session.loadMedia(request);
      setStatus(prev => ({ ...prev, currentMediaTitle: finalTitle, isMediaLoaded: true }));
      syncPlayerState();
      return true;
    } catch (err) {
      console.error('Erreur session.loadMedia:', err);
      throw err;
    }
  };

  const playOrPause = () => {
    if (remotePlayerControllerRef.current) {
      remotePlayerControllerRef.current.playOrPause();
    }
  };

  const seekRelative = (secondsDelta: number) => {
    const player = remotePlayerRef.current;
    const controller = remotePlayerControllerRef.current;
    if (player && controller) {
      player.currentTime = Math.max(0, Math.min(player.duration || Infinity, player.currentTime + secondsDelta));
      controller.seek();
    }
  };

  const setVolume = (level: number) => {
    const player = remotePlayerRef.current;
    const controller = remotePlayerControllerRef.current;
    if (player && controller) {
      player.volumeLevel = Math.max(0, Math.min(1, level));
      controller.setVolumeLevel();
    }
  };

  const toggleMute = () => {
    const controller = remotePlayerControllerRef.current;
    if (controller) {
      controller.muteOrUnmute();
    }
  };

  return {
    ...status,
    requestSession,
    endSession,
    loadMedia,
    playOrPause,
    seekRelative,
    setVolume,
    toggleMute,
  };
}
