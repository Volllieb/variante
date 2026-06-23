export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-24">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Willkommen auf der Client-Site
        </h1>
        <p className="text-lg text-gray-600">
          Diese Seite simuliert die fremde Website eines Kunden. Das AB-Snippet
          überschreibt die Farben von Überschrift und CTA-Button.
        </p>
        <a href="https://ab-spike.vercel.app" target="_blank" className="cta-btn rounded-full bg-gray-900 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-700">
          Jetzt starten
        </a>
        <p className="text-sm text-gray-400">
          Öffne die DevTools → Console, um die aktive Variante zu sehen.
        </p>
      </main>
    </div>
  );
}
