import preloadedRaw from './preloadedAnimes.json';
import { CatalogueData, EpisodeInfo } from '../components/AnimeSamaCatalog';

export interface PreloadedAnimeRecord extends CatalogueData {
  seasonEpisodes?: Record<string, EpisodeInfo[]>;
}

export const PRELOADED_ANIMES: Record<string, PreloadedAnimeRecord> = preloadedRaw as any;

export function findPreloadedAnime(url: string): PreloadedAnimeRecord | null {
  const cleanUrl = url.trim().endsWith('/') ? url.trim() : url.trim() + '/';
  
  if (PRELOADED_ANIMES[cleanUrl]) {
    return PRELOADED_ANIMES[cleanUrl];
  }

  // Recherche par mot-clé (overlord, jojo, gacha)
  const lower = cleanUrl.toLowerCase();
  for (const [key, data] of Object.entries(PRELOADED_ANIMES)) {
    if (lower.includes('overlord') && key.includes('overlord')) return data;
    if (lower.includes('jojo') && key.includes('jojo')) return data;
    if ((lower.includes('gacha') || lower.includes('9999')) && (key.includes('gacha') || key.includes('9999'))) return data;
    if ((lower.includes('frieren') || lower.includes('sousou')) && key.includes('frieren')) return data;
  }

  return null;
}
