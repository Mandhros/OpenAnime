import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PLAYER_NAME_MAP: Record<string, string> = {
  'vidmoly.to': 'Vidmoly',
  'vidmoly.net': 'Vidmoly',
  'vidmoly.biz': 'Vidmoly',
  'ansembed.net': 'Vidmoly / Ansembed',
  'uqload.vc': 'Uqload',
  'uqload.com': 'Uqload',
  'uqload.io': 'Uqload',
  'sendvid.com': 'Sendvid',
  'sibnet.ru': 'Sibnet',
  'oneupload.to': 'OneUpload',
  'smoothpre.com': 'Earnvids',
  'morencius.com': 'Earnvids',
  'movearnpre.com': 'Earnvids',
  'earnvids.com': 'Earnvids',
  'voe.sx': 'VOE',
  'vk.com': 'VK Video',
  'dailymotion.com': 'Dailymotion',
  'youtube.com': 'YouTube',
};

function getPlayerName(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    for (const [domain, name] of Object.entries(PLAYER_NAME_MAP)) {
      if (parsed.hostname.includes(domain)) {
        return name;
      }
    }
    return `Lecteur ${index} (${parsed.hostname.replace('www.', '')})`;
  } catch {
    return `Lecteur ${index}`;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. Endpoint pour analyser la page catalogue d'un anime (saisons, films, OAVs, scans)
  app.get('/api/animesama/catalogue', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: 'URL manquante' });
      }

      // Valider le format de l'URL
      let cleanUrl = targetUrl.trim();
      if (!cleanUrl.endsWith('/')) cleanUrl += '/';

      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Échec du chargement de la page Anime-Sama (Statut ${response.status})`
        });
      }

      const html = await response.text();

      // Extraction du titre principal
      const titleMatch = html.match(/<h1[^>]*id=["']titreOeuvre["'][^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : cleanUrl.split('/').filter(Boolean).pop() || 'Anime';

      // Titres alternatifs
      const alterMatch = html.match(/<p[^>]*id=["']titreAlter["'][^>]*>(.*?)<\/p>/i);
      const alterTitles = alterMatch ? alterMatch[1].trim() : '';

      // Affiche / Poster
      const posterMatch = html.match(/<div class=["']oe-affiche["']>[\s\S]*?<img src=["']([^"']+)["']/i);
      const poster = posterMatch ? posterMatch[1] : '';

      // Bannière de fond
      const bannerMatch = html.match(/<div class=["']oe-fond["'][^>]*>[\s\S]*?<img src=["']([^"']+)["']/i);
      const banner = bannerMatch ? bannerMatch[1] : '';

      // Métadonnées (année, type, studio, statut)
      const metaMatch = html.match(/<p class=["']oe-meta["'][^>]*>(.*?)<\/p>/i);
      const meta = metaMatch ? metaMatch[1].replace(/<[^>]+>/g, ' · ').trim() : '';

      // Synopsis
      const synopMatch = html.match(/<div class=["']oe-synop["'][^>]*>([\s\S]*?)<\/div>/i);
      const synopsis = synopMatch ? synopMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // Nettoyer les commentaires de blocs pour ne pas récupérer les exemples de code
      const cleanHtml = html.replace(/\/\*[\s\S]*?\*\//g, '');

      // Extraction des Saisons / Films / OAVs (panneauAnime)
      const seasons: Array<{
        name: string;
        path: string;
        fullUrl: string;
        type: 'saison' | 'film' | 'oav';
      }> = [];

      const regexAnime = /panneauAnime\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
      let match;
      while ((match = regexAnime.exec(cleanHtml)) !== null) {
        const name = match[1].trim();
        const subPath = match[2].trim();

        if (name !== 'nom' && subPath !== 'url') {
          const lowerName = name.toLowerCase();
          let itemType: 'saison' | 'film' | 'oav' = 'saison';
          if (lowerName.includes('film') || lowerName.includes('movie')) itemType = 'film';
          else if (lowerName.includes('oav') || lowerName.includes('ova')) itemType = 'oav';

          const fullUrl = cleanUrl + (subPath.startsWith('/') ? subPath.slice(1) : subPath) + (subPath.endsWith('/') ? '' : '/');

          seasons.push({
            name,
            path: subPath,
            fullUrl,
            type: itemType,
          });
        }
      }

      // Extraction des Scans / Mangas si présents (panneauScan)
      const scans: Array<{ name: string; path: string; fullUrl: string }> = [];
      const regexScan = /panneauScan\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
      while ((match = regexScan.exec(cleanHtml)) !== null) {
        const name = match[1].trim();
        const subPath = match[2].trim();
        if (name !== 'nom' && subPath !== 'url') {
          const fullUrl = cleanUrl + (subPath.startsWith('/') ? subPath.slice(1) : subPath) + (subPath.endsWith('/') ? '' : '/');
          scans.push({ name, path: subPath, fullUrl });
        }
      }

      return res.json({
        url: cleanUrl,
        title,
        alterTitles,
        poster,
        banner,
        meta,
        synopsis,
        seasonsCount: seasons.length,
        seasons,
        scans,
      });
    } catch (err: any) {
      console.error('Erreur catalogue:', err);
      return res.status(500).json({ error: err.message || 'Erreur interne' });
    }
  });

  // 2. Endpoint pour extraire les épisodes d'une saison ou d'un film
  app.get('/api/animesama/episodes', async (req, res) => {
    try {
      const catalogueUrl = (req.query.catalogueUrl as string || '').trim();
      const seasonPath = (req.query.seasonPath as string || '').trim();

      if (!catalogueUrl || !seasonPath) {
        return res.status(400).json({ error: 'catalogueUrl et seasonPath requis' });
      }

      const base = catalogueUrl.endsWith('/') ? catalogueUrl : catalogueUrl + '/';
      const cleanSub = seasonPath.startsWith('/') ? seasonPath.slice(1) : seasonPath;
      const seasonUrl = base + cleanSub + (cleanSub.endsWith('/') ? '' : '/');
      const episodesJsUrl = seasonUrl + 'episodes.js';

      const response = await fetch(episodesJsUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': seasonUrl,
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Fichier episodes.js introuvable ou protégé (Statut ${response.status})`
        });
      }

      const jsContent = await response.text();

      // Parser les tableaux var eps1 = [...]; var eps2 = [...];
      const playersData: Array<{
        playerIndex: number;
        urls: string[];
      }> = [];

      const regexEps = /(?:var\s+)?eps(\d+)\s*=\s*\[([\s\S]*?)\];/g;
      let match;
      while ((match = regexEps.exec(jsContent)) !== null) {
        const playerIndex = parseInt(match[1]);
        const rawContent = match[2];
        const urls: string[] = [];

        const urlRegex = /['"](https?:\/\/[^'"]+)['"]/g;
        let urlMatch;
        while ((urlMatch = urlRegex.exec(rawContent)) !== null) {
          urls.push(urlMatch[1]);
        }

        if (urls.length > 0) {
          playersData.push({ playerIndex, urls });
        }
      }

      // Trier les lecteurs par index
      playersData.sort((a, b) => a.playerIndex - b.playerIndex);

      const maxEpisodes = Math.max(...playersData.map(p => p.urls.length), 0);

      const episodes = [];
      for (let i = 0; i < maxEpisodes; i++) {
        const episodeNumber = i + 1;
        const episodePlayers = [];

        for (const player of playersData) {
          if (player.urls[i]) {
            const embedUrl = player.urls[i];
            episodePlayers.push({
              playerIndex: player.playerIndex,
              name: getPlayerName(embedUrl, player.playerIndex),
              embedUrl,
            });
          }
        }

        episodes.push({
          number: episodeNumber,
          title: `Épisode ${episodeNumber}`,
          players: episodePlayers,
        });
      }

      return res.json({
        seasonUrl,
        totalEpisodes: maxEpisodes,
        totalPlayers: playersData.length,
        episodes,
      });
    } catch (err: any) {
      console.error('Erreur épisodes:', err);
      return res.status(500).json({ error: err.message || 'Erreur interne' });
    }
  });

  // 3. Endpoint de résolution directe de stream vidéo (Sendvid, Sibnet, etc.)
  app.get('/api/animesama/resolve', async (req, res) => {
    try {
      const embedUrl = req.query.embedUrl as string;
      if (!embedUrl) {
        return res.status(400).json({ error: 'embedUrl manquante' });
      }

      const parsed = new URL(embedUrl);

      // Cas 1 : Vidmoly / Ansembed (HLS master .m3u8)
      if (parsed.hostname.includes('vidmoly') || parsed.hostname.includes('ansembed')) {
        const vidmolyRes = await fetch(embedUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://anime-sama.to/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        const html = await vidmolyRes.text();
        const m3u8Match = html.match(/file:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i) ||
                          html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
        if (m3u8Match && m3u8Match[1]) {
          return res.json({
            success: true,
            streamUrl: m3u8Match[1],
            type: 'application/x-mpegurl',
            host: 'Vidmoly',
            format: 'hls',
          });
        }
      }

      // Cas 2 : Sendvid (MP4 direct)
      if (parsed.hostname.includes('sendvid.com')) {
        const sendvidRes = await fetch(embedUrl, {
          headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://anime-sama.to/' },
        });
        const html = await sendvidRes.text();
        const videoMatch = html.match(/<source[^>]*src=["']([^"']+\.mp4[^"']*)["']/i) ||
                           html.match(/var\s+video_source\s*=\s*["']([^"']+)["']/i);
        if (videoMatch && videoMatch[1]) {
          return res.json({
            success: true,
            streamUrl: videoMatch[1],
            type: 'video/mp4',
            host: 'Sendvid',
            format: 'mp4',
          });
        }
      }

      // Cas 3 : Sibnet Video
      if (parsed.hostname.includes('sibnet.ru')) {
        const sibnetRes = await fetch(embedUrl, {
          headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://anime-sama.to/' },
        });
        const html = await sibnetRes.text();
        const match = html.match(/player\.src\(\[\s*\{\s*type:\s*["']video\/mp4["'],\s*src:\s*["']([^"']+)["']/i);
        if (match && match[1]) {
          const direct = match[1].startsWith('http') ? match[1] : `https://video.sibnet.ru${match[1]}`;
          return res.json({
            success: true,
            streamUrl: direct,
            type: 'video/mp4',
            host: 'Sibnet',
            format: 'mp4',
          });
        }
      }

      // Par défaut : l'embed URL peut être jouée dans notre lecteur sanbox anti-popups
      return res.json({
        success: false,
        embedUrl,
        message: 'Lecteur externe intégré (sécurisé sans popup)',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Configuration Vite en mode SPA / Dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur CastFlow démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
