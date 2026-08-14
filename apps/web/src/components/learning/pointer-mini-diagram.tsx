export function PointerMiniDiagram() {
  return (
    <div className="pointer-mini" aria-label="Diagrama: ptr aponta para x">
      <div className="mini-memory-heading"><span>MEMORY / FRAME #0</span><span>RSP + 0x10</span></div>
      <svg viewBox="0 0 420 210" role="img">
        <defs>
          <marker id="mini-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path d="M0,0 L0,7 L7,3.5z" fill="var(--accent)" /></marker>
          <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="1" /></pattern>
        </defs>
        <rect width="420" height="210" fill="url(#grid)" />
        <text x="28" y="35" className="mini-address">0x7ffe1000</text>
        <rect x="28" y="48" width="150" height="61" className="mini-box target" />
        <text x="44" y="73" className="mini-label">x</text><text x="155" y="73" textAnchor="end" className="mini-type">int · 4B</text>
        <text x="44" y="98" className="mini-value">20</text><text x="155" y="98" textAnchor="end" className="mini-bytes">14 00 00 00</text>
        <text x="242" y="132" className="mini-address">0x7ffe0ff8</text>
        <rect x="242" y="145" width="150" height="45" className="mini-box" />
        <text x="257" y="165" className="mini-label">ptr</text><text x="376" y="165" textAnchor="end" className="mini-type">int* · 8B</text>
        <text x="257" y="181" className="mini-pointer-value">0x7ffe1000</text>
        <path d="M242 167 C201 166 220 83 181 82" className="mini-wire" markerEnd="url(#mini-arrow)" />
      </svg>
      <div className="pointer-mini-caption"><span><i /> object</span><span><i /> pointer edge</span><strong>*ptr = 20</strong></div>
    </div>
  );
}

