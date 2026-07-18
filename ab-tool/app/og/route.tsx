import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const FONT_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files'

async function loadFont(weight: number): Promise<ArrayBuffer> {
  const suffix = weight === 700 ? '-700-normal' : '-400-normal'
  const url = `${FONT_BASE}/inter-latin-ext${suffix}.woff`
  // Fallback to latin-only if latin-ext not available
  try {
    return await fetch(url).then((r) => {
      if (!r.ok) throw new Error('not found')
      return r.arrayBuffer()
    })
  } catch {
    return fetch(
      `${FONT_BASE}/inter-latin${suffix}.woff`
    ).then((r) => r.arrayBuffer())
  }
}

export async function GET() {
  const [interRegular, interBold] = await Promise.all([loadFont(400), loadFont(700)])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          fontFamily: 'Inter',
        }}
      >
        {/* Panda Icon */}
        <svg
          width="160"
          height="160"
          viewBox="0 0 128 128"
          fill="none"
          style={{ marginBottom: 32 }}
        >
          <rect width="128" height="128" rx="64" fill="white" />
          <path
            d="M85 31.0395C96.3064 36.1352 103.56 40.8508 111.515 52C116.506 46.0537 116.818 39.9588 107.927 31.3368C98.2574 23.7553 91.2388 24.7959 85 31.0395Z"
            fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round"
          />
          <path
            d="M41 31.0395C30.4474 36.1352 23.677 40.8508 16.2528 52C11.5946 46.0537 11.3035 39.9588 19.601 31.3368C28.6265 23.7553 35.1771 24.7959 41 31.0395Z"
            fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round"
          />
          <path
            d="M29.9844 63.7676C35.3526 56.1126 44.8449 53.3376 51.1348 57.3037C57.3973 61.2527 58.3811 70.5812 53.0156 78.2324C47.6474 85.8874 38.1551 88.6624 31.8652 84.6963C25.6027 80.7473 24.6189 71.4188 29.9844 63.7676ZM75.8652 57.3037C82.1551 53.3376 91.6474 56.1126 97.0156 63.7676C102.381 71.4188 101.397 80.7473 95.1348 84.6963C88.8449 88.6624 79.3526 85.8874 73.9844 78.2324C68.6189 70.5812 69.6027 61.2527 75.8652 57.3037Z"
            fill="white" stroke="black" strokeWidth="6" strokeLinejoin="round"
          />
          <path
            d="M48.2363 62.0537C46.1076 62.0537 44.3359 63.6967 44.3359 65.7783C44.336 67.8599 46.1077 69.5029 48.2363 69.5029C50.365 69.5029 52.1367 67.8599 52.1367 65.7783C52.1367 63.6967 50.365 62.0537 48.2363 62.0537ZM78.7637 62.0537C76.635 62.0537 74.8633 63.6967 74.8633 65.7783C74.8633 67.8599 76.635 69.5029 78.7637 69.5029C80.8923 69.5029 82.664 67.8599 82.6641 65.7783C82.6641 63.6967 80.8924 62.0537 78.7637 62.0537Z"
            fill="black"
          />
          <path
            d="M63 97V105M63 97H58M63 97H68M63 105C58.0705 110.246 53.1059 110.195 48 104.5M63 105C68.3111 110.318 73.0412 110.1 78 104.5"
            stroke="black" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          A/B Testing from Figma
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: 'rgba(237,237,237,0.55)',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          No Dev Needed
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
      ],
    }
  )
}
