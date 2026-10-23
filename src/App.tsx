/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Radio, 
  FileCode, 
  BookOpen, 
  Clipboard, 
  X, 
  Sparkles, 
  Info, 
  Wifi, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useGoogleCast } from './hooks/useGoogleCast';
import { LocalPlayer } from './components/LocalPlayer';
import { CastRemote } from './components/CastRemote';
import { StreamHistory } from './components/StreamHistory';
import { VanillaCodeExporter } from './components/VanillaCodeExporter';
import { GitHubPagesGuide } from './components/GitHubPagesGuide';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'code' | 'guide'>('stream');
  const [videoUrl, setVideoUrl] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  );
  const [isLocalPlaying, setIsLocalPlaying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cast = useGoogleCast();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setVideoUrl(text.trim());
        showToast("URL collée depuis le presse-papier");
      }
    } catch (e) {
      console.warn("Accès au presse-papier non autorisé:", e);
    }
  };

  const detectFormat = (url: string) => {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.m3u8')) return 'HLS STREAM (.m3u8)';
    if (clean.endsWith('.webm')) return 'WEBM VIDEO';
    if (clean.endsWith('.mpd')) return 'DASH STREAM';
    return 'MP4 VIDEO';
  };

  const handlePlayLocal = () => {
    if (!videoUrl.trim()) {
      showToast("Veuillez saisir une URL de vidéo");
      return;
    }
    setIsLocalPlaying(true);
    showToast("Lecture démarrée sur le lecteur local");
  };

  const handleCastVideo = async () => {
    if (!videoUrl.trim()) {
      showToast("Veuillez saisir une URL de vidéo");
      return;
    }

    try {
      // Pause le lecteur local pour libérer la bande passante
      setIsLocalPlaying(false);
      showToast("Connexion à la télévision en cours...");
      await cast.loadMedia(videoUrl.trim());
      showToast("Vidéo transmise au Chromecast !");
    } catch (e: any) {
      console.error(e);
      showToast("Erreur de diffusion. Vérifiez la connexion Wi-Fi et les restrictions CORS.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-blue-600/95 text-white text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Info className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barre de navigation supérieure (Top Bar Contract 3-zones) */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Marque */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
            CastFlow <span className="text-blue-400 font-mono text-xs ml-1 font-semibold">PWA</span>
          </span>
        </div>

        {/* Zone 2: Onglets de Navigation principale */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('stream')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'stream'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Diffuseur & Lecteur</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Fichiers & Code Vanilla</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide GitHub Pages</span>
          </button>
        </nav>

        {/* Zone 3: Actions - Bouton Cast Launcher Officiel + Bouton Install PWA */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Bouton officiel Google Cast Launcher */}
          <div 
            className="p-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex items-center justify-center transition-colors"
            title="Lancer la diffusion Chromecast"
          >
            <google-cast-launcher className="w-8 h-8 block cursor-pointer" />
          </div>

          <PWAInstallButton />
        </div>
      </header>

      {/* Conteneur principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-10">

        {/* ================= ONGLET 1 : DIFFUSEUR & LECTEUR ================= */}
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Colonne Gauche : Saisie URL, Commandes et Télécommande Cast */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Carte principale de Saisie */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    <span>Lien de la vidéo externe (MP4 / HLS)</span>
                  </h2>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    {detectFormat(videoUrl)}
                  </span>
                </div>

                {/* Champ d'entrée avec effacement et collage */}
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Collez l'URL directe (ex: https://site.com/video.mp4 ou .m3u8)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 pr-20 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
                    spellCheck={false}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {videoUrl && (
                      <button
                        onClick={() => setVideoUrl('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Effacer le champ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={handlePaste}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Coller depuis le presse-papier"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Boutons d'action principaux (Hauteur ≥ 48px pour l'ergonomie mobile tactile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handlePlayLocal}
                    className="h-12 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 font-medium text-xs sm:text-sm text-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
                    <span>Lire sur le téléphone</span>
                  </button>

                  <button
                    onClick={handleCastVideo}
                    className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] font-semibold text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/25"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Diffuser sur la TV (Cast)</span>
                  </button>
                </div>

                {/* Flux d'exemples rapides pré-vérifiés */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exemples de test rapides (garantis sans blocage CORS) :</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-mono transition-colors"
                    >
                      Big Buck Bunny (MP4)
                    </button>
                    <button
                      onClick={() => setVideoUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-300 font-mono transition-colors"
                    >
                      Flux HLS Mux (.m3u8)
                    </button>
                    <button
                      onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-mono transition-colors"
                    >
                      Elephants Dream (MP4)
                    </button>
                  </div>
                </div>
              </div>

              {/* Télécommande Chromecast Active */}
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

              {/* État de la connectivité Cast */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cast.isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`} />
                  <span>
                    Statut Chromecast :{' '}
                    <strong className="text-slate-200">
                      {cast.isConnected ? `Connecté à ${cast.connectedDeviceName || 'la TV'}` : 'Prêt à diffuser sur le réseau Wi-Fi'}
                    </strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 hidden sm:block">
                  Default Media Receiver (CC1AD845)
                </div>
              </div>
            </div>

            {/* Colonne Droite : Lecteur Vidéo Local & Historique */}
            <div className="lg:col-span-5 space-y-6">
              {/* Lecteur Local */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-300">
                    Lecteur local (Smartphone / PC)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Support HLS.js inclus
                  </span>
                </div>
                <LocalPlayer
                  url={videoUrl}
                  isPlaying={isLocalPlaying}
                  onPlayStateChange={setIsLocalPlaying}
                />
              </div>

              {/* Historique et Favoris */}
              <div className="space-y-2">
                <div className="px-1">
                  <span className="text-xs font-semibold text-slate-300">
                    Historique & Favoris
                  </span>
                </div>
                <StreamHistory
                  currentUrl={videoUrl}
                  onSelect={(url) => {
                    setVideoUrl(url);
                    setIsLocalPlaying(true);
                  }}
                  onCast={(url) => {
                    setVideoUrl(url);
                    setIsLocalPlaying(false);
                    cast.loadMedia(url).catch(console.error);
                  }}
                />
              </div>
            </div>

          </div>
        )}

        {/* ================= ONGLET 2 : CODE SOURCE VANILLA ================= */}
        {activeTab === 'code' && (
          <VanillaCodeExporter />
        )}

        {/* ================= ONGLET 3 : GUIDE GITHUB PAGES ================= */}
        {activeTab === 'guide' && (
          <GitHubPagesGuide />
        )}

      </main>

      {/* Barre de navigation inférieure sur mobile (Thumb-zone Navigation Anchor) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-3 items-center h-16 px-2">
        <button
          onClick={() => setActiveTab('stream')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'stream' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] mt-1">Diffuseur</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'code' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <FileCode className="w-5 h-5" />
          <span className="text-[10px] mt-1">Code Vanilla</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'guide' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1">Guide Pages</span>
        </button>
      </nav>
    </div>
  );
}
