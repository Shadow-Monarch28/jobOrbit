// Decorative planet, sized by the `size` prop (px). Purely visual, so it is
// hidden from assistive tech. Each `variant` is a different planet: its own
// colour, surface pattern, ring (or none) and, for some, a small orbiting moon.
//   violet  smooth glossy sphere, cyan ring
//   ocean   teal water with cloud swirls, white moon, no ring
//   sunset  orange banded gas giant, wide gold ring
//   rose    pink cratered world, moon, no ring
//   emerald green continents, thin lime ring
//   amber   golden storm world, steep ring
const VARIANTS = {
  violet:  { ring: 'rgba(56, 189, 248, 0.75)', tiltA: -18, tiltB: -10, ringW: 1.05, ringH: 0.32, star: '#f59e0b', moon: null },
  ocean:   { ring: null, star: '#fde68a', moon: '#e2e8f0' },
  sunset:  { ring: 'rgba(253, 224, 71, 0.8)', tiltA: -12, tiltB: -4, ringW: 1.2, ringH: 0.26, star: '#fef08a', moon: null },
  rose:    { ring: null, star: '#fbbf24', moon: '#fde2f0' },
  emerald: { ring: 'rgba(190, 242, 100, 0.8)', tiltA: 14, tiltB: 6, ringW: 1.0, ringH: 0.3, star: '#fde047', moon: null },
  amber:   { ring: 'rgba(251, 146, 60, 0.8)', tiltA: -28, tiltB: -20, ringW: 1.0, ringH: 0.34, star: '#fb7185', moon: null },
}

export default function OrbitArt({ size = 160, className = '', float = false, variant = 'violet' }) {
  const v = VARIANTS[variant] || VARIANTS.violet
  const planet = Math.round(size * 0.62)
  const center = (size - planet) / 2
  const ringW = Math.round(size * (v.ringW || 1))
  const ringH = Math.round(size * (v.ringH || 0.3))
  const moonOrbit = Math.round(planet * 1.35)
  const moonSize = Math.max(6, Math.round(size * 0.09))
  return (
    <div
      aria-hidden="true"
      className={`jo-orbit-art ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} shrink-0 ${float ? 'jo-planet-float' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`jo-planet jo-planet-${VARIANTS[variant] ? variant : 'violet'}`}
        style={{ width: planet, height: planet, left: center, top: center }}
      />
      {v.ring && (
        <span
          className="jo-planet-ring"
          style={{
            width: ringW,
            height: ringH,
            left: (size - ringW) / 2,
            top: (size - ringH) / 2,
            '--jo-ring-color': v.ring,
            '--jo-tilt-a': `${v.tiltA}deg`,
            '--jo-tilt-b': `${v.tiltB}deg`,
          }}
        />
      )}
      {v.moon && (
        <span
          className="jo-moon-orbit"
          style={{ width: moonOrbit, height: moonOrbit, left: (size - moonOrbit) / 2, top: (size - moonOrbit) / 2 }}
        >
          <span className="jo-moon" style={{ width: moonSize, height: moonSize, '--jo-moon-color': v.moon }} />
        </span>
      )}
      <span
        className="jo-planet-star"
        style={{ right: size * 0.08, top: size * 0.08, fontSize: size * 0.16, '--jo-star-color': v.star }}
      >
        ✦
      </span>
    </div>
  )
}
