import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Film, 
  Layers, 
  Search, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  ShieldCheck,
  X,
  Server,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CurrentPlayingEpisode } from './CleanPlayer';
import { findPreloadedAnime } from '../data/animeData';
import { resolveStreamUrl } from '../utils/streamResolver';

export interface SeasonItem {
  name: string;
  path: string;
  fullUrl: string;
  type: 'saison' | 'film' | 'oav';
}

export interface CatalogueData {
  url: string;
  title: string;
  alterTitles: string;
  poster: string;
  banner: string;
  meta: string;
  synopsis: string;
  seasonsCount: number;
  seasons: SeasonItem[];
  scans: Array<{ name: string; path: string; fullUrl: string }>;
}

export interface PlayerInfo {
  playerIndex: number;
  name: string;
  embedUrl: string;
}

export interface EpisodeInfo {
  number: number;
  title: string;
  players: PlayerInfo[];
}

interface AnimeSamaCatalogProps {
  onPlayEpisode: (ep: CurrentPlayingEpisode) => void;
  onCastStream: (url: string, title: string) => void;
  currentPlayingNumber?: number | null;
  onEpisodesLoaded?: (episodes: EpisodeInfo[], animeTitle: string, seasonName: string) => void;
}

const PRESET_EXAMPLES = [
  {
    name: 'Frieren',
    url: 'https://anime-sama.to/catalogue/frieren/',
    badge: '28 Épisodes · S1',
  },
  {
    name: "JoJo's Bizarre Adventure",
    url: 'https://anime-sama.to/catalogue/jojos-bizarre-adventure/',
    badge: '8 Saisons & OAVs',
  },
  {
    name: 'Overlord',
    url: 'https://anime-sama.to/catalogue/overlord/',
    badge: '4 Saisons & Film',
  },
  {
    name: 'My Gift LVL 9999 Unlimited Gacha',
    url: 'https://anime-sama.to/catalogue/my-gift-lvl-9999-unlimited-gacha/',
    badge: 'Saison 1',
  },
];

// Détection intelligente de l'adresse de l'API
export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname.includes('github.io')) {
    return 'https://ais-dev-47dswayw2ex543j2f2eodr-146931597221.europe-west2.run.app';
  }
  return '';
}

export const AnimeSamaCatalog: React.FC<AnimeSamaCatalogProps> = ({
  onPlayEpisode,
  onCastStream,
  currentPlayingNumber,
  onEpisodesLoaded,
}) => {
  const [catalogUrl, setCatalogUrl] = useState<string>(
    'https://anime-sama.to/catalogue/overlord/'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CatalogueData | null>(null);
  const [showFullSynopsis, setShowFullSynopsis] = useState<boolean>(false);

  const [selectedSeason, setSelectedSeason] = useState<SeasonItem | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState<boolean>(false);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [searchEp, setSearchEp] = useState<string>('');

  // Lecteur sélectionné automatiquement pour toute la saison
  const [availableSeasonPlayers, setAvailableSeasonPlayers] = useState<Array<{
    playerIndex: number;
    name: string;
    count: number;
    isRecommended: boolean;
  }>>([]);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);

  const [resolvingEpNumber, setResolvingEpNumber] = useState<number | null>(null);
  const [isUsingPreloaded, setIsUsingPreloaded] = useState<boolean>(false);

  // Charger le catalogue
  const fetchCatalogue = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setEpisodes([]);
    setSelectedSeason(null);
    setAvailableSeasonPlayers([]);
    setSelectedPlayerIndex(null);
    setIsUsingPreloaded(false);
    setShowFullSynopsis(false);

    // 1. Données pré-chargées garanties
    const preloaded = findPreloadedAnime(targetUrl);
    if (preloaded) {
      setData(preloaded);
      setIsUsingPreloaded(true);
      if (preloaded.seasons && preloaded.seasons.length > 0) {
        loadSeasonEpisodes(preloaded.url, preloaded.seasons[0], preloaded);
      }
      setLoading(false);
      return;
    }

    // 2. Sinon appel API avec fallback
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/animesama/catalogue?url=${encodeURIComponent(targetUrl.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement du catalogue');
      }
      setData(json);
      if (json.seasons && json.seasons.length > 0) {
        loadSeasonEpisodes(json.url, json.seasons[0]);
      }
    } catch (err: any) {
      const fallback = findPreloadedAnime(targetUrl);
      if (fallback) {
        setData(fallback);
        setIsUsingPreloaded(true);
        if (fallback.seasons && fallback.seasons.length > 0) {
          loadSeasonEpisodes(fallback.url, fallback.seasons[0], fallback);
        }
      } else {
        setError(err.message || 'Impossible de récupérer la fiche Anime-Sama.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les épisodes d'une saison & Déterminer automatiquement le meilleur lecteur
  const loadSeasonEpisodes = async (baseUrl: string, season: SeasonItem, preloadedRef?: any) => {
    setSelectedSeason(season);
    setEpisodesLoading(true);
    setEpisodes([]);
    setAvailableSeasonPlayers([]);
    setSelectedPlayerIndex(null);

    // Vérifier si en cache local
    const activeData = preloadedRef || data;
    if (activeData?.seasonEpisodes && activeData.seasonEpisodes[season.path]) {
      const cachedEps: EpisodeInfo[] = activeData.seasonEpisodes[season.path];
      applyEpisodes(cachedEps, season.name, activeData.title);
      setEpisodesLoading(false);
      return;
    }

    try {
      const apiBase = getApiBase();
      const res = await fetch(
        `${apiBase}/api/animesama/episodes?catalogueUrl=${encodeURIComponent(baseUrl)}&seasonPath=${encodeURIComponent(season.path)}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement des épisodes');
      }

      const eps: EpisodeInfo[] = json.episodes || [];
      applyEpisodes(eps, season.name, data?.title || 'Anime');
    } catch (err: any) {
      console.warn('Erreur épisodes API:', err);
      const fallback = findPreloadedAnime(baseUrl);
      if (fallback?.seasonEpisodes && fallback.seasonEpisodes[season.path]) {
        applyEpisodes(fallback.seasonEpisodes[season.path], season.name, fallback.title);
      }
    } finally {
      setEpisodesLoading(false);
    }
  };

  const applyEpisodes = (eps: EpisodeInfo[], seasonName: string, animeTitle: string) => {
    setEpisodes(eps);
    onEpisodesLoaded?.(eps, animeTitle, seasonName);

    // Algorithme de sélection automatique du meilleur lecteur
    const playerStats: Record<number, { name: string; count: number }> = {};
    eps.forEach(ep => {
      ep.players.forEach(p => {
        if (!playerStats[p.playerIndex]) {
          playerStats[p.playerIndex] = { name: p.name, count: 0 };
        }
        playerStats[p.playerIndex].count++;
      });
    });

    const totalEps = eps.length;
    const sortedPlayers = Object.entries(playerStats).map(([idx, stat]) => {
      const playerIndex = parseInt(idx);
      const nameLower = stat.name.toLowerCase();
      const isRecommended = (nameLower.includes('vidmoly') || nameLower.includes('ansembed') || nameLower.includes('sendvid')) && stat.count >= totalEps * 0.8;
      return {
        playerIndex,
        name: stat.name,
        count: stat.count,
        isRecommended,
      };
    }).sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.count - a.count;
    });

    setAvailableSeasonPlayers(sortedPlayers);

    if (sortedPlayers.length > 0) {
      setSelectedPlayerIndex(sortedPlayers[0].playerIndex);
    }
  };

  useEffect(() => {
    fetchCatalogue(catalogUrl);
  }, []);

  // Lancer un épisode dans le lecteur propre
  const handleLaunchEpisode = async (ep: EpisodeInfo) => {
    if (!data || !selectedSeason) return;

    const chosenPlayer = ep.players.find(p => p.playerIndex === selectedPlayerIndex) || ep.players[0];
    if (!chosenPlayer) return;

    setResolvingEpNumber(ep.number);

    try {
      const apiBase = getApiBase();
      const resolved = await resolveStreamUrl(chosenPlayer.embedUrl, apiBase);

      if (resolved.success && resolved.streamUrl) {
        onPlayEpisode({
          animeTitle: data.title,
          seasonName: selectedSeason.name,
          episodeNumber: ep.number,
          totalEpisodes: episodes.length,
          title: ep.title,
          streamUrl: resolved.streamUrl,
          embedUrl: chosenPlayer.embedUrl,
          isDirectStream: true,
          playerName: resolved.host || chosenPlayer.name,
          mimeType: resolved.type,
        });
      } else {
        onPlayEpisode({
          animeTitle: data.title,
          seasonName: selectedSeason.name,
          episodeNumber: ep.number,
          totalEpisodes: episodes.length,
          title: ep.title,
          streamUrl: undefined,
          embedUrl: chosenPlayer.embedUrl,
          isDirectStream: false,
          playerName: chosenPlayer.name,
        });
      }
    } catch {
      onPlayEpisode({
        animeTitle: data.title,
        seasonName: selectedSeason.name,
        episodeNumber: ep.number,
        totalEpisodes: episodes.length,
        title: ep.title,
        streamUrl: undefined,
        embedUrl: chosenPlayer.embedUrl,
        isDirectStream: false,
        playerName: chosenPlayer.name,
      });
    } finally {
      setResolvingEpNumber(null);
    }
  };

  const filteredEpisodes = episodes.filter(ep => 
    !searchEp || ep.number.toString().includes(searchEp) || ep.title.toLowerCase().includes(searchEp.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Barre de recherche d'anime (Optimisée Pixel 8) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Fiches Anime-Sama</span>
          </h2>

          {isUsingPreloaded && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Garantie Sans Pub</span>
            </span>
          )}
        </div>

        {/* Input avec bouton Analyser (Tactile Pixel 8) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={catalogUrl}
            onChange={(e) => setCatalogUrl(e.target.value)}
            placeholder="https://anime-sama.to/catalogue/..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
            spellCheck={false}
          />
          <button
            onClick={() => fetchCatalogue(catalogUrl)}
            disabled={loading}
            className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-semibold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/25 shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Analyser</span>
          </button>
        </div>

        {/* Exemples rapides défilables horizontalement au pouce */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Exemples rapides :</span>
          </div>
          <div className="flex sm:grid sm:grid-cols-3 gap-2 overflow-x-auto no-scrollbar pb-1">
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                onClick={() => {
                  setCatalogUrl(ex.url);
                  fetchCatalogue(ex.url);
                }}
                className={`p-2 rounded-xl border text-left transition-all shrink-0 min-w-[170px] sm:min-w-0 flex flex-col justify-between active:scale-95 ${
                  catalogUrl === ex.url
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-xs'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-medium text-xs text-slate-200 truncate">{ex.name}</div>
                <div className="text-[10px] text-blue-400 font-mono mt-0.5">{ex.badge}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="rounded-2xl bg-rose-950/30 border border-rose-800/60 p-3.5 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Fiche de l'Anime */}
      {data && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          {/* Header Visuel Responsive pour Pixel 8 */}
          <div className="relative p-3.5 sm:p-6 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
            {data.banner && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none blur-xs"
                style={{ backgroundImage: `url(${data.banner})` }}
              />
            )}

            <div className="relative flex gap-3.5 sm:gap-5 items-start">
              {data.poster && (
                <img
                  src={data.poster}
                  alt={data.title}
                  className="w-20 sm:w-28 rounded-xl object-cover shadow-2xl border border-slate-700 shrink-0 aspect-[2/3]"
                />
              )}

              <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                <h1 className="text-base sm:text-xl font-bold text-white tracking-tight leading-tight">
                  {data.title}
                </h1>

                {data.alterTitles && (
                  <p className="text-[11px] text-slate-400 truncate">
                    {data.alterTitles}
                  </p>
                )}

                {data.meta && (
                  <div className="text-[11px] text-blue-400 font-medium">
                    {data.meta}
                  </div>
                )}

                {data.synopsis && (
                  <div className="pt-0.5">
                    <p className={`text-xs text-slate-300 leading-relaxed ${showFullSynopsis ? '' : 'line-clamp-2'}`}>
                      {data.synopsis}
                    </p>
                    {data.synopsis.length > 120 && (
                      <button
                        onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                        className="text-[10px] text-blue-400 font-medium mt-0.5 flex items-center gap-0.5 hover:underline"
                      >
                        <span>{showFullSynopsis ? 'Réduire' : 'Lire la suite'}</span>
                        {showFullSynopsis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 flex-wrap">
                  <span>{data.seasonsCount} sections</span>
                  <span>·</span>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Anime-Sama</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sélecteur défilable de Saisons / Films / OAVs */}
          <div className="border-t border-slate-800 p-3 bg-slate-950/70">
            <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span>Saisons & Films disponibles :</span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {data.seasons.map((season) => {
                const isSelected = selectedSeason?.path === season.path;
                return (
                  <button
                    key={season.path}
                    onClick={() => loadSeasonEpisodes(data.url, season)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{season.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {season.type.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SÉLECTION AUTOMATIQUE DU LECTEUR POUR LA SAISON */}
          {availableSeasonPlayers.length > 0 && (
            <div className="p-3 bg-blue-950/20 border-t border-b border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] sm:text-xs text-slate-200 font-semibold">
                  Lecteur automatique :
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {availableSeasonPlayers.map((player) => {
                  const isSelected = selectedPlayerIndex === player.playerIndex;
                  return (
                    <button
                      key={player.playerIndex}
                      onClick={() => setSelectedPlayerIndex(player.playerIndex)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{player.name}</span>
                      {player.isRecommended && (
                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-blue-700 text-white' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          TOP
                        </span>
                      )}
                      <span className="text-[9px] opacity-70 font-mono">
                        ({player.count}/{episodes.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liste des Épisodes - Grille optimisée Pixel 8 */}
          <div className="p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {selectedSeason ? selectedSeason.name : 'Épisodes'}
                </span>
                {episodes.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({episodes.length})
                  </span>
                )}
              </div>

              {episodes.length > 6 && (
                <div className="relative w-36 sm:w-48">
                  <input
                    type="text"
                    value={searchEp}
                    onChange={(e) => setSearchEp(e.target.value)}
                    placeholder="Épisode..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
                  />
                  {searchEp && (
                    <button
                      onClick={() => setSearchEp('')}
                      className="absolute right-2 top-1.5 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {episodesLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span>Chargement des épisodes...</span>
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {episodes.length === 0
                  ? 'Aucun épisode détecté pour cette section.'
                  : 'Aucun épisode ne correspond à votre filtre.'}
              </div>
            ) : (
              /* Grille tactile 2 colonnes sur Pixel 8 (412px), 3 ou 4 colonnes sur tablette/desktop */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredEpisodes.map((ep) => {
                  const isCurrent = currentPlayingNumber === ep.number;
                  const chosenPlayer = ep.players.find(p => p.playerIndex === selectedPlayerIndex) || ep.players[0];
                  const isResolving = resolvingEpNumber === ep.number;

                  return (
                    <div
                      key={ep.number}
                      onClick={() => handleLaunchEpisode(ep)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-98 ${
                        isCurrent
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold ${
                          isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                        }`}>
                          {ep.number}
                        </span>

                        {isCurrent ? (
                          <span className="text-[9px] text-blue-400 font-mono font-bold">
                            EN COURS
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">
                            {chosenPlayer?.name || 'Auto'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-medium text-slate-200 truncate">
                        {ep.title}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchEpisode(ep);
                        }}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95"
                      >
                        {isResolving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-white" />
                        )}
                        <span>Lire</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
