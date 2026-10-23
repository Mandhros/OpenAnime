import React, { useState } from 'react';
import { 
  GitBranch, 
  Globe, 
  ShieldCheck, 
  Smartphone, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  HelpCircle
} from 'lucide-react';

export const GitHubPagesGuide: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const gitCliCommands = `# 1. Cloner ou initialiser un nouveau dépôt local
mkdir mon-cast-pwa
cd mon-cast-pwa
git init

# 2. Copier les fichiers index.html, manifest.json, sw.js et vos icônes dans ce dossier

# 3. Ajouter et valider les fichiers
git add .
git commit -m "feat: initial commit PWA Cast pour GitHub Pages"

# 4. Lier à votre dépôt GitHub distant (remplacez VOTRE_PSEUDO et NOM_DEPOT)
git branch -M main
git remote add origin https://github.com/VOTRE_PSEUDO/NOM_DEPOT.git

# 5. Pousser vers GitHub
git push -u origin main`;

  return (
    <div className="space-y-6">
      {/* Introduction Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-600/30 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Déploiement Gratuit sur GitHub Pages en 5 Minutes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              GitHub Pages fournit un hébergement statique 100% gratuit avec un certificat <strong>SSL HTTPS automatique</strong>. C'est l'hébergeur idéal car Google Cast Sender exige impérativement un contexte sécurisé HTTPS pour autoriser le smartphone à communiquer avec le Chromecast sur votre réseau Wi-Fi local.
            </p>
          </div>
        </div>
      </div>

      {/* Étapes détaillées */}
      <div className="space-y-4">

        {/* Étape 1 */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              1
            </div>
            <h4 className="text-sm font-semibold text-white">Créer un nouveau dépôt sur GitHub</h4>
          </div>
          <div className="text-xs text-slate-300 space-y-2 ml-10">
            <p>1. Connectez-vous sur <a href="https://github.com" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-0.5">github.com <ExternalLink className="w-3 h-3 inline" /></a>.</p>
            <p>2. Cliquez sur le bouton vert <strong>« New »</strong> (ou rendez-vous sur <code className="text-slate-200">github.com/new</code>).</p>
            <p>3. Donnez un nom au dépôt, par exemple <code className="text-blue-300 font-mono">web-cast-pwa</code>.</p>
            <p>4. Choisissez <strong>Public</strong> (requis pour GitHub Pages en offre gratuite).</p>
            <p>5. Cliquez sur <strong>« Create repository »</strong>.</p>
          </div>
        </div>

        {/* Étape 2 */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              2
            </div>
            <h4 className="text-sm font-semibold text-white">Ajouter les fichiers du projet</h4>
          </div>
          <div className="text-xs text-slate-300 space-y-3 ml-10">
            <p>Vous avez le choix entre deux méthodes très simples :</p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-slate-200 block mb-1">Méthode A : Directement dans le navigateur (Sans installation)</strong>
              <p className="text-slate-400 leading-relaxed">
                Sur la page de votre nouveau dépôt GitHub, cliquez sur <em>« uploading an existing file »</em>. Glissez-déposez les fichiers téléchargés depuis l'onglet <strong>« Fichiers & Code Vanilla »</strong> :
                <br />
                • <code className="text-blue-400">index.html</code><br />
                • <code className="text-amber-400">manifest.json</code><br />
                • <code className="text-emerald-400">sw.js</code><br />
                • Les icônes (<code className="text-slate-300">icon-192.png</code>, <code className="text-slate-300">icon-512.png</code>, <code className="text-slate-300">icon.svg</code>).
                <br />Puis cliquez sur <strong>Commit changes</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  Méthode B : En ligne de commande avec Git
                </strong>
                <button
                  onClick={() => copyToClipboard(gitCliCommands, 'git-cli')}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                >
                  {copiedCmd === 'git-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'git-cli' ? 'Copié !' : 'Copier script'}</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto p-2 bg-[#0a0f1d] rounded-lg">
                <code>{gitCliCommands}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Étape 3 */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              3
            </div>
            <h4 className="text-sm font-semibold text-white">Activer le service GitHub Pages</h4>
          </div>
          <div className="text-xs text-slate-300 space-y-2 ml-10">
            <p>1. Dans votre dépôt GitHub, cliquez sur l'onglet <strong>Settings</strong> (en haut à droite).</p>
            <p>2. Dans le menu latéral gauche, cliquez sur <strong>Pages</strong> (rubrique <em>Code and automation</em>).</p>
            <p>3. Sous <strong>« Build and deployment »</strong> :</p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 my-1 font-mono text-[11px]">
              • Source : <strong>Deploy from a branch</strong><br />
              • Branch : sélectionnez <strong>main</strong> (ou master)<br />
              • Folder : sélectionnez <strong>/ (root)</strong>
            </div>
            <p>4. Cliquez sur <strong>Save</strong>.</p>
            <p className="text-slate-400">
              ⏳ Attendez environ 30 à 60 secondes. Un bandeau vert apparaîtra en haut avec l'adresse publique :
              <br />
              <code className="text-emerald-400 font-bold">https://&lt;votre-pseudo&gt;.github.io/&lt;nom-depot&gt;/</code>
            </p>
          </div>
        </div>

        {/* Étape 4 */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              4
            </div>
            <h4 className="text-sm font-semibold text-white">Ouvrir et installer sur Smartphone Android</h4>
          </div>
          <div className="text-xs text-slate-300 space-y-2 ml-10">
            <p>1. Sur votre smartphone Android, ouvrez l'URL GitHub Pages dans <strong>Google Chrome</strong>.</p>
            <p>2. Assurez-vous que votre smartphone est connecté au <strong>même réseau Wi-Fi</strong> que votre télévision ou Chromecast.</p>
            <p>3. Chrome détectera automatiquement le Manifest PWA et vous proposera <strong>« Ajouter CastFlow à l'écran d'accueil »</strong>.</p>
            <p>4. L'application s'ouvre ensuite en plein écran sans barre d'adresse, comme une application native du Play Store !</p>
          </div>
        </div>

      </div>

      {/* Précisions & Contraintes Techniques Indispensables */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Règles Techniques Importantes pour Chromecast</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HTTPS Obligatoire */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span>1. HTTPS Strictement Requis</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Google Chrome bloque le SDK Cast sur les sites HTTP non sécurisés. GitHub Pages fournit nativement un certificat SSL sécurisé (<code className="text-blue-300">https://</code>), ce qui garantit le fonctionnement du bouton Cast.
            </p>
          </div>

          {/* CORS Header */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>2. Restrictions CORS des Hébergeurs Vidéo</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Le Chromecast va charger directement l'URL de la vidéo depuis son propre système. Le serveur hébergeant la vidéo doit soit autoriser le streaming public sans token temporaire restreint par IP, soit inclure l'en-tête HTTP <code className="text-amber-300">Access-Control-Allow-Origin: *</code>.
            </p>
          </div>

          {/* Formats Vidéos */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <Smartphone className="w-4 h-4" />
              <span>3. Formats & Codecs TV Supportés</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              • <strong>MP4</strong> : Codec vidéo H.264 / AVC + Audio AAC.<br />
              • <strong>HLS (.m3u8)</strong> : Streaming adaptatif multi-débit (géré nativement par Chromecast).<br />
              • <strong>WebM</strong> : Codecs VP8 / VP9 + Audio Opus.
            </p>
          </div>

          {/* Résolution des pannes */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
              <HelpCircle className="w-4 h-4" />
              <span>4. Votre TV n'apparaît pas ?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Vérifiez que :<br />
              • Le smartphone et la TV sont sur le même réseau Wi-Fi (attention à l'isolation réseau invité).<br />
              • Les autorisations de réseau local de Chrome sont activées.<br />
              • Vous utilisez Google Chrome ou un navigateur basé sur Chromium.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
