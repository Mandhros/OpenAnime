/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Layers, 
  Sparkles, 
  Info, 
  Film, 
  ListVideo,
  ShieldCheck,
  ChevronRight,
  Radio
} from 'lucide-react';
import { useGoogleCast } from './hooks/useGoogleCast';
import { CleanPlayer, CurrentPlayingEpisode } from './components/CleanPlayer';
import { CastRemote } from './components/CastRemote';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AnimeSamaCatalog, EpisodeInfo, getApiBase } from './components/AnimeSamaCatalog';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'player' | 'cast'>('catalog');
  
  // Épisode actuellement en cours de lecture
  const [currentEpisode, setCurrentEpisode] = useState<CurrentPlayingEpisode | null>(null);

  // Liste des épisodes de la saison courante
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeInfo[]>([]);
  const [currentAnimeTitle, setCurrentAnimeTitle] = useState<string>('');
  const [currentSeasonName, setCurrentSeasonName] = useState<string>('');

  // Option de lecture enchaînée automatique
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('openanime_autoplay');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cast = useGoogleCast();

  useEffect(() => {
    try {
      localStorage.setItem('openanime_autoplay', JSON.stringify(autoPlayNext));
    } catch (e) {
      console.warn('localStorage:', e);
    }
  }, [autoPlayNext]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Mise en mémoire des épisodes chargés
  const handleEpisodesLoaded = (episodes: EpisodeInfo[], animeTitle: string, seasonName: string) => {
    setSeasonEpisodes(episodes);
    setCurrentAnimeTitle(animeTitle);
    setCurrentSeasonName(seasonName);
  };

  // Lecture d'un épisode sélectionné
  const handlePlayEpisode = (ep: CurrentPlayingEpisode) => {
    setCurrentEpisode(ep);
    setActiveTab('player');
    showToast(`Lecture : ${ep.animeTitle} - ${ep.title}`);
  };

  // Résolution et lecture d'un numéro d'épisode spécifique dans la saison
  const playEpisodeByNumber = async (epNumber: number) => {
    const targetEp = seasonEpisodes.find(e => e.number === epNumber);
    if (!targetEp) return;

    // Prendre le lecteur préféré
    const player = targetEp.players.find(p => p.name.toLowerCase().includes('vidmoly') || p.name.toLowerCase().includes('sendvid')) || targetEp.players[0];
    if (!player) return;

    try {
      showToast(`Chargement épisode ${epNumber}...`);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/animesama/resolve?embedUrl=${encodeURIComponent(player.embedUrl)}`);
      const json = await res.json();

      if (json.success && json.streamUrl) {
        setCurrentEpisode({
          animeTitle: currentAnimeTitle,
          seasonName: currentSeasonName,
          episodeNumber: targetEp.number,
          totalEpisodes: seasonEpisodes.length,
          title: targetEp.title,
          streamUrl: json.streamUrl,
          embedUrl: player.embedUrl,
          isDirectStream: true,
          playerName: player.name,
          mimeType: json.type,
        });
      } else {
        setCurrentEpisode({
          animeTitle: currentAnimeTitle,
          seasonName: currentSeasonName,
          episodeNumber: targetEp.number,
          totalEpisodes: seasonEpisodes.length,
          title: targetEp.title,
          streamUrl: undefined,
          embedUrl: player.embedUrl,
          isDirectStream: false,
          playerName: player.name,
        });
      }

      showToast(`Épisode ${epNumber} prêt`);
    } catch {
      showToast(`Erreur chargement épisode ${epNumber}`);
    }
  };

  const handleNextEpisode = () => {
    if (!currentEpisode) return;
    const nextNum = currentEpisode.episodeNumber + 1;
    if (nextNum <= currentEpisode.totalEpisodes) {
      playEpisodeByNumber(nextNum);
    }
  };

  const handlePrevEpisode = () => {
    if (!currentEpisode) return;
    const prevNum = currentEpisode.episodeNumber - 1;
    if (prevNum >= 1) {
      playEpisodeByNumber(prevNum);
    }
  };

  const handleCastToTV = async (streamUrl: string, title: string) => {
    if (!streamUrl) {
      showToast("URL de stream indisponible pour le cast.");
      return;
    }

    try {
      showToast("Connexion à la TV en cours...");
      await cast.loadMedia(streamUrl, title);
      showToast("Diffusion lancée sur Chromecast !");
      setActiveTab('player');
    } catch (e: any) {
      console.error(e);
      showToast("Diffusion échouée. Vérifiez votre Wi-Fi.");
    }
  };

  const hasNext = currentEpisode ? currentEpisode.episodeNumber < currentEpisode.totalEpisodes : false;
  const hasPrev = currentEpisode ? currentEpisode.episodeNumber > 1 : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-safe-nav">
      
      {/* Toast Notification ergonomique en haut sous le poinçon Pixel 8 */}
      {toastMessage && (
        <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-blue-600/95 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 max-w-[90vw] animate-in fade-in slide-in-from-top-3 duration-200">
          <Info className="w-4 h-4 shrink-0 text-cyan-200" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Barre de navigation supérieure (Optimisée Google Pixel 8) */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Marque OpenAnime */}
        <div 
          onClick={() => setActiveTab('catalog')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 active:scale-95 transition-transform">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
              OpenAnime
            </span>
            <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1 py-0.2 rounded">
              v3
            </span>
          </div>
        </div>

        {/* Navigation Desktop / Tablette */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catalogue</span>
          </button>

          <button
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'player'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Lecteur & TV</span>
            {currentEpisode && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('cast')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cast'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Cast {cast.isConnected ? `(${cast.connectedDeviceName})` : ''}</span>
          </button>
        </nav>

        {/* Actions : Bouton Google Cast & Bouton Install PWA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div 
            className="p-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center transition-colors min-w-[36px] min-h-[36px]"
            title="Diffuser vers Chromecast"
          >
            <google-cast-launcher className="w-6 h-6 sm:w-7 sm:h-7 block cursor-pointer" />
          </div>

          <PWAInstallButton />
        </div>
      </header>

      {/* Conteneur principal optimisé Pixel 8 (412px à large écran) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-5">

        {/* ================= ONGLET 1 : CATALOGUE & RECHERCHE ================= */}
        {activeTab === 'catalog' && (
          <AnimeSamaCatalog
            onPlayEpisode={handlePlayEpisode}
            onCastStream={(url, title) => handleCastToTV(url, title)}
            currentPlayingNumber={currentEpisode?.episodeNumber}
            onEpisodesLoaded={handleEpisodesLoaded}
          />
        )}

        {/* ================= ONGLET 2 : LECTEUR PROPRE ================= */}
        {activeTab === 'player' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Lecteur Vidéo Zéro-Pub avec Autoplay */}
            <CleanPlayer
              episode={currentEpisode}
              onNextEpisode={handleNextEpisode}
              onPrevEpisode={handlePrevEpisode}
              hasNextEpisode={hasNext}
              hasPrevEpisode={hasPrev}
              autoPlayNext={autoPlayNext}
              onToggleAutoPlayNext={setAutoPlayNext}
              onCastToTV={handleCastToTV}
              isCasting={cast.isConnected}
              connectedTVName={cast.connectedDeviceName}
            />

            {/* Télécommande Chromecast si session active */}
            {cast.isConnected && (
              <CastRemote
                status={cast}
                onPlayPause={cast.playOrPause}
                onSeek={cast.seekRelative}
                onVolumeChange={cast.setVolume}
                onToggleMute={cast.toggleMute}
                onDisconnect={cast.endSession}
              />
            )}

            {/* Sélecteur rapide des épisodes de la saison (Grille tactile pour mobile) */}
            {seasonEpisodes.length > 0 && currentEpisode && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      Épisodes ({currentEpisode.seasonName})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {seasonEpisodes.length} épisodes
                  </span>
                </div>

                {/* Grille tactile optimisée pour écran Pixel 8 (412px) */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {seasonEpisodes.map((ep) => {
                    const isCur = ep.number === currentEpisode.episodeNumber;
                    return (
                      <button
                        key={ep.number}
                        onClick={() => playEpisodeByNumber(ep.number)}
                        className={`h-11 sm:h-12 rounded-xl text-xs font-mono font-medium transition-all flex flex-col items-center justify-center active:scale-95 ${
                          isCur
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span className="text-[9px] opacity-70 leading-none">EP</span>
                        <span className="text-xs sm:text-sm font-bold leading-tight">{ep.number}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= ONGLET 3 : CAST / DIFFUSION TV ================= */}
        {activeTab === 'cast' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Diffusion Chromecast</h2>
                  <p className="text-xs text-slate-400">
                    Diffusez vos animes directement vers votre Smart TV sans pub ni interruption.
                  </p>
                </div>
              </div>

              {cast.isConnected ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-300">
                        Connecté à : {cast.connectedDeviceName || 'Télévision'}
                      </span>
                    </div>
                    <button
                      onClick={() => cast.endSession()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                    >
                      Déconnecter
                    </button>
                  </div>

                  <CastRemote
                    status={cast}
                    onPlayPause={cast.playOrPause}
                    onSeek={cast.seekRelative}
                    onVolumeChange={cast.setVolume}
                    onToggleMute={cast.toggleMute}
                    onDisconnect={cast.endSession}
                  />
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <Radio className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs text-slate-300 font-medium">Aucun écran TV connecté</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Assurez-vous que votre smartphone Google Pixel 8 et votre TV sont connectés au même réseau Wi-Fi, puis touchez le bouton ci-dessous :
                    </p>
                  </div>
                  <div className="inline-flex justify-center p-2 rounded-xl bg-slate-900 border border-slate-700">
                    <google-cast-launcher className="w-8 h-8 block cursor-pointer" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Barre de navigation mobile inférieure (Ergonomie Thumb-Zone Pixel 8) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 grid grid-cols-3 items-center h-16 px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            activeTab === 'catalog' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-1">Catalogue</span>
        </button>

        <button
          onClick={() => setActiveTab('player')}
          className={`flex flex-col items-center justify-center py-1 transition-all relative active:scale-95 ${
            activeTab === 'player' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-[10px] mt-1">Lecteur</span>
          {currentEpisode && (
            <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('cast')}
          className={`flex flex-col items-center justify-center py-1 transition-all relative active:scale-95 ${
            activeTab === 'cast' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] mt-1">Cast TV</span>
          {cast.isConnected && (
            <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </nav>

    </div>
  );
}
