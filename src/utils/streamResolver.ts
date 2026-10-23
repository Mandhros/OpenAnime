/**
 * Stream Resolver Universel pour OpenAnime
 * Permet d'extraire le flux direct HLS (.m3u8) ou MP4 depuis les lecteurs Vidmoly, Ansembed, Sendvid, Sibnet, Uqload.
 * Évite les publicités, les redirections, les faux boutons de téléchargement et l'intro forcée Anime-Sama.
 * Fonctionne à la fois en local avec le backend Node.js et en standalone sur GitHub Pages via proxys CORS.
 */

export interface ResolvedStreamResult {
  success: boolean;
  streamUrl?: string;
  type?: 'application/x-mpegurl' | 'video/mp4';
  host?: string;
  embedUrl: string;
}

// Extraction regex selon l'hébergeur
export function extractDirectStreamFromHtml(html: string, embedUrl: string): { streamUrl: string; type: 'application/x-mpegurl' | 'video/mp4'; host: string } | null {
  try {
    const urlObj = new URL(embedUrl);
    const host = urlObj.hostname.toLowerCase();

    // 1. Vidmoly / Ansembed (HLS master .m3u8)
    if (host.includes('vidmoly') || host.includes('ansembed') || host.includes('vmpx') || host.includes('vmget')) {
      const match = html.match(/sources:\s*\[\s*\{\s*file:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i) ||
                    html.match(/file:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i) ||
                    html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
      if (match && match[1]) {
        return {
          streamUrl: match[1],
          type: 'application/x-mpegurl',
          host: 'Vidmoly (HLS Direct)',
        };
      }
    }

    // 2. Sendvid (Direct MP4)
    if (host.includes('sendvid.com')) {
      const match = html.match(/var\s+video_source\s*=\s*["']([^"']+\.mp4[^"']*)["']/i) ||
                    html.match(/<source[^>]*src=["']([^"']+\.mp4[^"']*)["']/i);
      if (match && match[1]) {
        return {
          streamUrl: match[1],
          type: 'video/mp4',
          host: 'Sendvid (MP4 Direct)',
        };
      }
    }

    // 3. Sibnet (Direct MP4)
    if (host.includes('sibnet.ru')) {
      const match = html.match(/player\.src\(\[\s*\{\s*type:\s*["']video\/mp4["'],\s*src:\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        const full = match[1].startsWith('http') ? match[1] : `https://video.sibnet.ru${match[1]}`;
        return {
          streamUrl: full,
          type: 'video/mp4',
          host: 'Sibnet (MP4 Direct)',
        };
      }
    }

    // 4. Uqload (HLS .m3u8 ou MP4 direct)
    if (host.includes('uqload')) {
      const m3u8Match = html.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
      if (m3u8Match && m3u8Match[1]) {
        return {
          streamUrl: m3u8Match[1].replace(/\\/g, ''),
          type: 'application/x-mpegurl',
          host: 'Uqload (HLS Direct)',
        };
      }
      const mp4Match = html.match(/(https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*)/i);
      if (mp4Match && mp4Match[1]) {
        return {
          streamUrl: mp4Match[1].replace(/\\/g, ''),
          type: 'video/mp4',
          host: 'Uqload (MP4 Direct)',
        };
      }
    }

    // Extraction générique de dernier recours (.m3u8 ou .mp4)
    const genM3u8 = html.match(/['"](https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)['"]/i);
    if (genM3u8 && genM3u8[1]) {
      return {
        streamUrl: genM3u8[1],
        type: 'application/x-mpegurl',
        host: 'Flux HLS Détecté',
      };
    }
  } catch (e) {
    console.warn('Erreur extraction stream:', e);
  }

  return null;
}

/**
 * Résolution asynchrone ultra-rapide avec fallbacks multiples
 */
export async function resolveStreamUrl(embedUrl: string, apiBase: string): Promise<ResolvedStreamResult> {
  if (!embedUrl) {
    return { success: false, embedUrl: '' };
  }

  // Si c'est déjà un flux direct
  if (embedUrl.includes('.m3u8')) {
    return {
      success: true,
      streamUrl: embedUrl,
      type: 'application/x-mpegurl',
      host: 'Direct HLS',
      embedUrl,
    };
  }
  if (embedUrl.includes('.mp4')) {
    return {
      success: true,
      streamUrl: embedUrl,
      type: 'video/mp4',
      host: 'Direct MP4',
      embedUrl,
    };
  }

  // Étape 1 : Essai via l'API backend interne (avec timeout 2.5s)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${apiBase}/api/animesama/resolve?embedUrl=${encodeURIComponent(embedUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.streamUrl) {
        return {
          success: true,
          streamUrl: data.streamUrl,
          type: data.type || 'application/x-mpegurl',
          host: data.host || 'Serveur OpenAnime',
          embedUrl,
        };
      }
    }
  } catch {
    // API backend indisponible ou en timeout (GitHub Pages standalone) -> passage au fallback client
  }

  // Étape 2 : Essai client direct via proxys CORS publics
  const corsProxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];

  for (const proxyFn of corsProxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const proxyUrl = proxyFn(embedUrl);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const extracted = extractDirectStreamFromHtml(html, embedUrl);
        if (extracted) {
          return {
            success: true,
            streamUrl: extracted.streamUrl,
            type: extracted.type,
            host: extracted.host,
            embedUrl,
          };
        }
      }
    } catch {
      // Continuer vers le proxy suivant
    }
  }

  // Fallback propre : l'URL externe sera chargée dans le conteneur sécurisé sans blocage
  return {
    success: false,
    embedUrl,
  };
}
