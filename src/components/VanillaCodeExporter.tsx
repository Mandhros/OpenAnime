import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Layers, ShieldCheck, ExternalLink } from 'lucide-react';

export const VanillaCodeExporter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'index.html' | 'manifest.json' | 'sw.js'>('index.html');
  const [copied, setCopied] = useState<string | null>(null);

  const filesContent = {
    'index.html': `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>CastFlow - Diffuseur Vidéo Chromecast</title>
  
  <!-- Configuration PWA -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#090d16">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" type="image/svg+xml" href="icon.svg">
  <link rel="apple-touch-icon" href="icon-192.png">

  <!-- 1. Google Cast Web Sender SDK officiel -->
  <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
  
  <!-- 2. HLS.js pour lecture locale des flux m3u8 sur mobile -->
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>

  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f293d;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .app-container { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 16px; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
    }
    google-cast-launcher {
      width: 36px;
      height: 36px;
      cursor: pointer;
      --connected-color: #3b82f6;
      --disconnected-color: #94a3b8;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
    }
    input[type="url"] {
      width: 100%;
      background: #0d1322;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      color: #fff;
      font-family: monospace;
      font-size: 0.95rem;
      outline: none;
      margin-bottom: 12px;
    }
    input[type="url"]:focus { border-color: var(--primary); }
    .btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn {
      padding: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.1s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: var(--primary); color: white; }
    .btn-secondary { background: #1e293b; color: #e2e8f0; }
    .player-wrap {
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 14px;
      overflow: hidden;
      margin-top: 10px;
    }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <div class="app-container">
    <header>
      <div style="font-weight: 700; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
        <span style="color: #3b82f6;">▶</span> CastFlow
      </div>
      <!-- Bouton officiel Google Cast Web Sender -->
      <google-cast-launcher id="castbutton"></google-cast-launcher>
    </header>

    <div class="card">
      <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">URL DE LA VIDÉO</h3>
      <input type="url" id="videoUrl" placeholder="https://exemple.com/video.mp4 ou .m3u8" value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
      <div class="btn-row">
        <button id="playBtn" class="btn btn-secondary">▶ Sur téléphone</button>
        <button id="castBtn" class="btn btn-primary">📡 Diffuser TV</button>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">LECTEUR LOCAL</h3>
      <div class="player-wrap">
        <video id="player" controls playsinline></video>
      </div>
    </div>
  </div>

  <script>
    let castContext = null;
    let hls = null;
    const urlInput = document.getElementById('videoUrl');
    const player = document.getElementById('player');

    // 1. Initialisation Google Cast
    window['__onGCastApiAvailable'] = function(isAvailable) {
      if (isAvailable) {
        castContext = cast.framework.CastContext.getInstance();
        castContext.setOptions({
          receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
      }
    };

    function getMime(url) {
      const u = url.split('?')[0].toLowerCase();
      if (u.endsWith('.m3u8')) return 'application/x-mpegurl';
      if (u.endsWith('.webm')) return 'video/webm';
      return 'video/mp4';
    }

    // 2. Lecture Locale avec HLS.js
    document.getElementById('playBtn').addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) return;
      const type = getMime(url);

      if (type === 'application/x-mpegurl') {
        if (Hls.isSupported()) {
          if (hls) hls.destroy();
          hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(player);
          hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
          player.src = url;
          player.play();
        }
      } else {
        if (hls) { hls.destroy(); hls = null; }
        player.src = url;
        player.play();
      }
    });

    // 3. Diffusion Chromecast
    document.getElementById('castBtn').addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) return alert('Veuillez entrer une URL.');
      if (!castContext) return alert('Chromecast non prêt.');

      let session = castContext.getCurrentSession();
      if (!session) {
        try {
          await castContext.requestSession();
          session = castContext.getCurrentSession();
        } catch (e) {
          return;
        }
      }
      if (!session) return;

      const mediaInfo = new chrome.cast.media.MediaInfo(url, getMime(url));
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = url.split('/').pop() || 'Vidéo Externe';

      const req = new chrome.cast.media.LoadRequest(mediaInfo);
      req.autoplay = true;

      session.loadMedia(req).then(
        () => player.pause(),
        (err) => alert('Erreur Cast : Vérifiez les restrictions CORS de la vidéo.')
      );
    });

    // 4. Enregistrement PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  </script>
</body>
</html>`,

    'manifest.json': `{
  "id": "./",
  "name": "CastFlow - Diffuseur Chromecast PWA",
  "short_name": "CastFlow",
  "description": "Diffusez des vidéos MP4 et flux HLS externes sur votre TV via Chromecast directement depuis votre smartphone Android.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#090d16",
  "theme_color": "#090d16",
  "categories": ["utilities", "entertainment", "video"],
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}`,

    'sw.js': `// Service Worker pour CastFlow PWA (Compatible GitHub Pages)
const CACHE_NAME = 'castflow-gh-pages-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Ignorer requêtes Google Cast SDK et segments vidéo volumineux
  if (
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('jsdelivr.net') ||
    event.request.url.includes('.mp4') ||
    event.request.url.includes('.m3u8') ||
    event.request.url.includes('.ts')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});`
  };

  const handleCopy = (filename: keyof typeof filesContent) => {
    navigator.clipboard.writeText(filesContent[filename]);
    setCopied(filename);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDownload = (filename: keyof typeof filesContent) => {
    const content = filesContent[filename];
    const mimeTypes: Record<string, string> = {
      'index.html': 'text/html',
      'manifest.json': 'application/json',
      'sw.js': 'application/javascript',
    };
    const blob = new Blob([content], { type: mimeTypes[filename] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Explication de la structure des fichiers */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Structure des 3 Fichiers Standalone</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Ce projet est conçu pour fonctionner <strong>sans compilation Node.js</strong> et sans serveur backend. Vous pouvez placer ces fichiers directement à la racine de votre dépôt GitHub pour un hébergement immédiat sur GitHub Pages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="font-mono text-xs font-semibold text-blue-400 mb-1">1. index.html</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Contient l'interface responsive, le chargeur officiel Google Cast (<code className="text-slate-300">&lt;google-cast-launcher&gt;</code>), la bibliothèque HLS.js et la logique de transmission vidéo vers la TV.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="font-mono text-xs font-semibold text-amber-400 mb-1">2. manifest.json</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Définit les paramètres de la PWA : nom court, mode plein écran (<code className="text-slate-300">standalone</code>), thèmes de couleur sombre et icônes d'application pour l'écran d'accueil Android.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="font-mono text-xs font-semibold text-emerald-400 mb-1">3. sw.js</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Le Service Worker qui gère le cache hors-ligne de l'interface, assurant que l'application reste rapide, fiable et installable même en cas de mauvaise connectivité.
            </p>
          </div>
        </div>
      </div>

      {/* Visualiseur de code avec onglets et copie */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {/* Barre d'onglets */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {(['index.html', 'manifest.json', 'sw.js'] as const).map((file) => (
              <button
                key={file}
                onClick={() => setActiveTab(file)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  activeTab === file
                    ? 'bg-slate-800 text-blue-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all active:scale-95"
            >
              {copied === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier {activeTab}</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownload(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Télécharger ce fichier sur votre ordinateur"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>
          </div>
        </div>

        {/* Bloc de code */}
        <div className="p-4 bg-[#0a0f1d] overflow-x-auto max-h-[500px]">
          <pre className="font-mono text-xs leading-relaxed text-slate-200">
            <code>{filesContent[activeTab]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
