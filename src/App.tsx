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
  ChevronRight
} from 'lucide-react';
import { useGoogleCast } from './hooks/useGoogleCast';
import { CleanPlayer, CurrentPlayingEpisode } from './components/CleanPlayer';
import { CastRemote } from './components/CastRemote';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AnimeSamaCatalog, EpisodeInfo } from './components/AnimeSamaCatalog';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'player'>('catalog');
  
  // Épisode actuellement en cours de lecture
  const [currentEpisode, setCurrentEpisode] = useState<CurrentPlayingEpisode | null>(null);

  // Liste des épisodes de la saison courante (pour navigation suivant / précédent)
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeInfo[]>([]);
  const [currentAnimeTitle, setCurrentAnimeTitle] = useState<string>('');
  const [currentSeasonName, setCurrentSeasonName] = useState<string>('');

  // Option de lecture enchaînée automatique (Point 5)
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
    setTimeout(() => setToastMessage(null), 3000);
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

    // Prendre le lecteur préféré (ex: Vidmoly/Sendvid ou premier disponible)
    const player = targetEp.players.find(p => p.name.toLowerCase().includes('vidmoly') || p.name.toLowerCase().includes('sendvid')) || targetEp.players[0];
    if (!player) return;

    try {
      showToast(`Chargement de l'épisode ${epNumber}...`);
      const res = await fetch(`/api/animesama/resolve?embedUrl=${encodeURIComponent(player.embedUrl)}`);
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

      showToast(`Épisode ${epNumber} démarré`);
    } catch {
      showToast(`Erreur lors du chargement de l'épisode ${epNumber}`);
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
      showToast("Connexion à la télévision en cours...");
      await cast.loadMedia(streamUrl, title);
      showToast("Diffusion lancée sur le Chromecast !");
    } catch (e: any) {
      console.error(e);
      showToast("Erreur lors de la diffusion Chromecast. Vérifiez le Wi-Fi.");
    }
  };

  const hasNext = currentEpisode ? currentEpisode.episodeNumber < currentEpisode.totalEpisodes : false;
  const hasPrev = currentEpisode ? currentEpisode.episodeNumber > 1 : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-blue-600/95 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Info className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barre de navigation supérieure (OpenAnime) */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Marque OpenAnime */}
        <div 
          onClick={() => setActiveTab('catalog')}
          className="flex items-center gap-3 cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
              OpenAnime
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded hidden sm:inline-block">
              ANIME-SAMA
            </span>
          </div>
        </div>

        {/* Navigation : Catalogue vs Lecteur */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
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
        </nav>

        {/* Actions : Bouton Google Cast Officiel + Bouton Install PWA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            className="p-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex items-center justify-center transition-colors"
            title="Diffuser vers Chromecast"
          >
            <google-cast-launcher className="w-8 h-8 block cursor-pointer" />
          </div>

          <PWAInstallButton />
        </div>
      </header>

      {/* Conteneur principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">

        {/* ================= ONGLET 1 : CATALOGUE & RECHERCHE ================= */}
        {activeTab === 'catalog' && (
          <AnimeSamaCatalog
            onPlayEpisode={handlePlayEpisode}
            onCastStream={(url, title) => handleCastToTV(url, title)}
            currentPlayingNumber={currentEpisode?.episodeNumber}
            onEpisodesLoaded={handleEpisodesLoaded}
          />
        )}

        {/* ================= ONGLET 2 : LECTEUR PROPRE & CHROMECAST ================= */}
        {activeTab === 'player' && (
          <div className="space-y-6">
            
            {/* Lecteur Vidéo Zéro-Pub avec Autoplay (Point 4 & 5) */}
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

            {/* Télécommande Chromecast si connectée */}
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

            {/* Liste rapide des épisodes de la saison pour changer en 1 clic */}
            {seasonEpisodes.length > 0 && currentEpisode && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      Épisodes disponibles dans {currentEpisode.seasonName}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {seasonEpisodes.length} épisodes
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {seasonEpisodes.map((ep) => {
                    const isCur = ep.number === currentEpisode.episodeNumber;
                    return (
                      <button
                        key={ep.number}
                        onClick={() => playEpisodeByNumber(ep.number)}
                        className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-center flex flex-col items-center justify-center gap-1 ${
                          isCur
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.03]'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span className="text-[11px]">Épisode</span>
                        <span className="text-sm font-bold">{ep.number}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Barre de navigation mobile inférieure (Thumb-zone Anchor) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-2 items-center h-16 px-4">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'catalog' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-1">Catalogue</span>
        </button>

        <button
          onClick={() => setActiveTab('player')}
          className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
            activeTab === 'player' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-[10px] mt-1">Lecteur & TV</span>
          {currentEpisode && (
            <span className="absolute top-2 right-12 w-2 h-2 rounded-full bg-cyan-400" />
          )}
        </button>
      </nav>
    </div>
  );
}
