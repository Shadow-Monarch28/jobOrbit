// Decorative planet + ring + star, sized by the `size` prop (px).
// Purely visual, so it is hidden from assistive tech.
export default function OrbitArt({ size = 160, className = '', float = false }) {
  const planet = Math.round(size * 0.62)
  const ringW = Math.round(size * 1.05)
  const ringH = Math.round(size * 0.32)
  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 ${float ? 'jo-planet-float' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="jo-planet"
        style={{ width: planet, height: planet, left: (size - planet) / 2, top: (size - planet) / 2 }}
      />
      <span
        className="jo-planet-ring"
        style={{ width: ringW, height: ringH, left: (size - ringW) / 2, top: (size - ringH) / 2 }}
      />
      <span className="jo-planet-star" style={{ right: size * 0.08, top: size * 0.08, fontSize: size * 0.16 }}>
        ✦
      </span>
    </div>
  )
}
