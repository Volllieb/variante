export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-center">
      <h1 className="mb-3 text-3xl font-bold">Variante</h1>
      <p className="mb-8 text-gray-500">
        Designer-native A/B testing: pick an element, generate Variant B with AI, ship one snippet.
      </p>
      <div className="flex justify-center gap-3">
        <a
          href="/login"
          className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Log in
        </a>
        <a
          href="/signup"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Create account
        </a>
      </div>
    </div>
  )
}
