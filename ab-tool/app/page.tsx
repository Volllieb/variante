export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-center">
      <h1 className="mb-3 text-3xl font-bold">Variante</h1>
      <p className="mb-8 text-gray-500">
        Designer-natives A/B-Testing: Element wählen, Variante B per KI generieren, ein Snippet einbauen.
      </p>
      <div className="flex justify-center gap-3">
        <a
          href="/login"
          className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anmelden
        </a>
        <a
          href="/signup"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Konto erstellen
        </a>
      </div>
    </div>
  )
}
