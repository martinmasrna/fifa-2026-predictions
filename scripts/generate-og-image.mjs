// Generates public/og.png — the social share / link-preview image.
// One-off helper. To run:  npm i --no-save @resvg/resvg-js && node scripts/generate-og-image.mjs
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'node:fs'

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0E6E41"/>
      <stop offset="0.6" stop-color="#138A52"/>
      <stop offset="1" stop-color="#1BA862"/>
    </linearGradient>
    <pattern id="stripes" width="152" height="630" patternUnits="userSpaceOnUse">
      <rect width="76" height="630" fill="#ffffff" opacity="0.045"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#stripes)"/>

  <text x="112" y="148" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="8" fill="#ffffff" fill-opacity="0.72">JPZK</text>

  <rect x="112" y="248" width="10" height="156" rx="5" fill="#D99B27"/>

  <text x="152" y="322" font-family="Helvetica, Arial, sans-serif" font-size="86" font-weight="700" fill="#ffffff">FIFA World Cup 2026</text>

  <text x="152" y="392" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="400" fill="#ffffff" fill-opacity="0.92">6 weeks &#183; 104 matches &#183; 1 champion</text>

  <text x="112" y="558" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="400" fill="#ffffff" fill-opacity="0.6">Make your picks before the first whistle &#183; June 11</text>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica' },
})
writeFileSync(new URL('../public/og.png', import.meta.url), resvg.render().asPng())
console.log('Wrote public/og.png')
