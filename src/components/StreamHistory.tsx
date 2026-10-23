import React, { useState, useEffect } from 'react';
import { History, Star, Play, Tv, Trash2, ExternalLink } from 'lucide-react';

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  isFavorite: boolean;
  addedAt: number;
}

interface StreamHistoryProps {
  onSelect: (url: string) => void;
  onCast: (url: string) => void;
  currentUrl: string;
}

export const StreamHistory: React.FC<StreamHistoryProps> = ({ onSelect, onCast, currentUrl }) => {
  const [items, setItems] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('castflow_streams');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erreur lecture localStorage:', e);
    }
    return [
      {
        id: '1',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Big Buck Bunny (MP4)',
        isFavorite: true,
        addedAt: Date.now() - 3600000,
      },
      {
        id: '2',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        title: 'Flux HLS Adaptatif Big Buck Bunny (.m3u8)',
        isFavorite: true,
        addedAt: Date.now() - 7200000,
      },
      {
        id: '3',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        title: 'Elephants Dream (MP4)',
        isFavorite: false,
        addedAt: Date.now() - 10800000,
      },
    ];
  });

  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    try {
      localStorage.setItem('castflow_streams', JSON.stringify(items));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage:', e);
    }
  }, [items]);

  const toggleFavorite = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm("Voulez-vous vraiment effacer l'historique non-favori ?")) {
      setItems(prev => prev.filter(item => item.isFavorite));
    }
  };

  const filteredItems = items.filter(item => filter === 'all' || item.isFavorite);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      {/* Barre d'onglets de filtrage */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'favorites'
                ? 'bg-slate-800 text-amber-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Favoris ({items.filter(i => i.isFavorite).length})
          </button>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
            title="Effacer les éléments non favoris"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nettoyer</span>
          </button>
        )}
      </div>

      {/* Liste des flux */}
      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            {filter === 'favorites' ? "Aucun flux favori enregistré." : "Aucune vidéo dans l'historique."}
          </div>
        ) : (
          filteredItems.map(item => {
            const isCurrent = item.url === currentUrl;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                  isCurrent
                    ? 'bg-blue-950/30 border-blue-600/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                    title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(item.url)}>
                    <div className="font-medium text-slate-200 truncate flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-blue-400 font-mono bg-blue-950/80 px-1 rounded">
                          Actif
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {item.url}
                    </div>
                  </div>
                </div>

                {/* Boutons d'actions rapides */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSelect(item.url)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    title="Prévisualiser sur le téléphone"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  <button
                    onClick={() => onCast(item.url)}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Diffuser sur la TV (Cast)"
                  >
                    <Tv className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
