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
  X
} from 'lucide-react';
import { CurrentPlayingEpisode } from './CleanPlayer';

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

  const [selectedSeason, setSelectedSeason] = useState<SeasonItem | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState<boolean>(false);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [searchEp, setSearchEp] = useState<string>('');

  // Lecteur sélectionné automatiquement pour toute la saison (Point 3)
  const [availableSeasonPlayers, setAvailableSeasonPlayers] = useState<Array<{
    playerIndex: number;
    name: string;
    count: number;
    isRecommended: boolean;
  }>>([]);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);

  const [resolvingEpNumber, setResolvingEpNumber] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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

    try {
      const res = await fetch(`/api/animesama/catalogue?url=${encodeURIComponent(targetUrl.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement du catalogue');
      }
      setData(json);
      if (json.seasons && json.seasons.length > 0) {
        loadSeasonEpisodes(json.url, json.seasons[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la fiche Anime-Sama.');
    } finally {
      setLoading(false);
    }
  };

  // Charger les épisodes d'une saison & Déterminer automatiquement le meilleur lecteur (Point 3)
  const loadSeasonEpisodes = async (baseUrl: string, season: SeasonItem) => {
    setSelectedSeason(season);
    setEpisodesLoading(true);
    setEpisodes([]);
    setAvailableSeasonPlayers([]);
    setSelectedPlayerIndex(null);

    try {
      const res = await fetch(
        `/api/animesama/episodes?catalogueUrl=${encodeURIComponent(baseUrl)}&seasonPath=${encodeURIComponent(season.path)}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement des épisodes');
      }

      const eps: EpisodeInfo[] = json.episodes || [];
      setEpisodes(eps);
      onEpisodesLoaded?.(eps, data?.title || 'Anime', season.name);

      // Algorithme de sélection automatique du meilleur lecteur (Point 3)
      // 1. Compter la présence de chaque lecteur sur l'ensemble des épisodes
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
        // Privilégier Vidmoly (HLS sans pub) ou Sendvid (MP4 direct)
        const isRecommended = (nameLower.includes('vidmoly') || nameLower.includes('ansembed') || nameLower.includes('sendvid')) && stat.count >= totalEps * 0.8;
        return {
          playerIndex,
          name: stat.name,
          count: stat.count,
          isRecommended,
        };
      }).sort((a, b) => {
        // En premier les recommandés, puis ceux qui couvrent 100% des épisodes, puis par nombre décroissant
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return b.count - a.count;
      });

      setAvailableSeasonPlayers(sortedPlayers);

      // Sélectionner automatiquement le lecteur n°1
      if (sortedPlayers.length > 0) {
        setSelectedPlayerIndex(sortedPlayers[0].playerIndex);
      }
    } catch (err: any) {
      console.warn('Erreur épisodes:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue(catalogUrl);
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Lancer un épisode dans le lecteur propre (Point 4)
  const handleLaunchEpisode = async (ep: EpisodeInfo) => {
    if (!data || !selectedSeason) return;

    // Trouver le lecteur sélectionné pour cet épisode, ou le premier disponible
    const chosenPlayer = ep.players.find(p => p.playerIndex === selectedPlayerIndex) || ep.players[0];
    if (!chosenPlayer) return;

    setResolvingEpNumber(ep.number);

    try {
      // Résoudre le stream direct (Sendvid MP4 ou Vidmoly HLS) pour lecture 100% sans popup
      const res = await fetch(`/api/animesama/resolve?embedUrl=${encodeURIComponent(chosenPlayer.embedUrl)}`);
      const resolveJson = await res.json();

      if (resolveJson.success && resolveJson.streamUrl) {
        onPlayEpisode({
          animeTitle: data.title,
          seasonName: selectedSeason.name,
          episodeNumber: ep.number,
          totalEpisodes: episodes.length,
          title: ep.title,
          streamUrl: resolveJson.streamUrl,
          embedUrl: chosenPlayer.embedUrl,
          isDirectStream: true,
          playerName: chosenPlayer.name,
          mimeType: resolveJson.type,
        });
      } else {
        // Fallback lecteur sandbox sécurisé sans popup
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
    <div className="space-y-6">
      {/* Barre de recherche d'anime */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Catalogue & Fiches Anime-Sama</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Entrez l'URL d'une fiche anime pour extraire automatiquement toutes les saisons, films et épisodes sans popup.
            </p>
          </div>
        </div>

        {/* Input avec bouton Analyser */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={catalogUrl}
            onChange={(e) => setCatalogUrl(e.target.value)}
            placeholder="https://anime-sama.to/catalogue/nom-de-l-anime/"
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
            spellCheck={false}
          />
          <button
            onClick={() => fetchCatalogue(catalogUrl)}
            disabled={loading}
            className="h-11 sm:h-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] font-semibold text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/25 shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Analyser l'anime</span>
          </button>
        </div>

        {/* Exemples rapides demandés */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Exemples rapides :</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                onClick={() => {
                  setCatalogUrl(ex.url);
                  fetchCatalogue(ex.url);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  catalogUrl === ex.url
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-xs'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-medium text-xs text-slate-200 truncate">{ex.name}</div>
                <div className="text-[10px] text-blue-400 font-mono mt-1">{ex.badge}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-2xl bg-rose-950/30 border border-rose-800/60 p-4 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Fiche de l'Anime */}
      {data && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          {/* Header Visuel avec Bannière & Poster */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent">
            {data.banner && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none blur-xs"
                style={{ backgroundImage: `url(${data.banner})` }}
              />
            )}

            <div className="relative flex flex-col sm:flex-row gap-5 items-start">
              {data.poster && (
                <img
                  src={data.poster}
                  alt={data.title}
                  className="w-24 sm:w-32 rounded-xl object-cover shadow-2xl border border-slate-700 shrink-0 aspect-[2/3]"
                />
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {data.title}
                </h1>

                {data.alterTitles && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {data.alterTitles}
                  </p>
                )}

                {data.meta && (
                  <div className="text-xs text-blue-400 font-medium">
                    {data.meta}
                  </div>
                )}

                {data.synopsis && (
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl line-clamp-3">
                    {data.synopsis}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
                  <span>{data.seasonsCount} saisons / films répertoriés</span>
                  <span>·</span>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Fiche Anime-Sama</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sélecteur de Saisons / Films / OAVs */}
          <div className="border-t border-slate-800 p-4 bg-slate-950/70">
            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span>Saisons, Films & OAVs disponibles :</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.seasons.map((season) => {
                const isSelected = selectedSeason?.path === season.path;
                return (
                  <button
                    key={season.path}
                    onClick={() => loadSeasonEpisodes(data.url, season)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{season.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {season.type.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SÉLECTION AUTOMATIQUE DU LECTEUR POUR LA SAISON (Point 3) */}
          {availableSeasonPlayers.length > 0 && (
            <div className="p-4 bg-blue-950/20 border-t border-b border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-200 font-semibold">
                  Lecteur automatique pour la saison :
                </span>
              </div>

              {/* Sélecteur de lecteur avec badge de recommandation */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableSeasonPlayers.map((player) => {
                  const isSelected = selectedPlayerIndex === player.playerIndex;
                  return (
                    <button
                      key={player.playerIndex}
                      onClick={() => setSelectedPlayerIndex(player.playerIndex)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{player.name}</span>
                      {player.isRecommended && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-blue-700 text-white' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          RECOMMANDÉ
                        </span>
                      )}
                      <span className="text-[10px] opacity-70 font-mono">
                        ({player.count}/{episodes.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liste des Épisodes */}
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {selectedSeason ? `Épisodes de : ${selectedSeason.name}` : 'Épisodes'}
                </span>
                {episodes.length > 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    ({episodes.length} épisodes)
                  </span>
                )}
              </div>

              {/* Recherche rapide d'épisode */}
              {episodes.length > 6 && (
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    value={searchEp}
                    onChange={(e) => setSearchEp(e.target.value)}
                    placeholder="Filtrer épisode (ex: 3)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                  {searchEp && (
                    <button
                      onClick={() => setSearchEp('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* État de chargement des épisodes */}
            {episodesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span>Chargement des épisodes et sélection du meilleur lecteur...</span>
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {episodes.length === 0
                  ? 'Aucun épisode détecté pour cette section.'
                  : 'Aucun épisode ne correspond à votre filtre.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredEpisodes.map((ep) => {
                  const isCurrent = currentPlayingNumber === ep.number;
                  const chosenPlayer = ep.players.find(p => p.playerIndex === selectedPlayerIndex) || ep.players[0];
                  const isResolving = resolvingEpNumber === ep.number;

                  return (
                    <div
                      key={ep.number}
                      onClick={() => handleLaunchEpisode(ep)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                        isCurrent
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 group-hover:bg-blue-600 group-hover:text-white'
                          }`}>
                            {ep.number}
                          </span>
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {ep.title}
                          </span>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] text-blue-400 font-mono font-semibold">
                            EN COURS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span className="truncate">
                          Lecteur : <strong className="text-slate-300">{chosenPlayer?.name || 'Automatique'}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchEpisode(ep);
                            }}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center gap-1 transition-all shadow-xs"
                          >
                            {isResolving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3 fill-white" />
                            )}
                            <span>Lire</span>
                          </button>
                        </div>
                      </div>
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
