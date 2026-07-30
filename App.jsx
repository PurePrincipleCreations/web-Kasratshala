/**
 * KASRATSHALA — Full Hero Component
 * Copy-paste into bolt.new / StackBlitz / any Vite React project
 *
 * npm install framer-motion
 * Then set this as your App.jsx (or import as a component)
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, animate } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════
   SEEDED RNG — same tree shape every render
═══════════════════════════════════════════════════════════════ */
function rng(seed = 7) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/* ═══════════════════════════════════════════════════════════════
   BUILD TREE GEOMETRY  (called once on mount/resize)
═══════════════════════════════════════════════════════════════ */
function buildTree(W, H) {
  const rand  = rng(42)
  const cx    = W * 0.50
  const floor = H * 0.72          // "ground" line

  /* ── ROOTS ────────────────────────────────────────────── */
  const roots = []
  const NROOTS = 22
  for (let i = 0; i < NROOTS; i++) {
    const t     = i / (NROOTS - 1)
    const angle = (t - 0.5) * Math.PI * 1.72   // ±154° spread

    // how far each root reaches — outermost roots go furthest
    const edgeness = Math.abs(t - 0.5) * 2     // 0=centre, 1=edge
    const maxLen   = W * (0.24 + edgeness * 0.32 + rand() * 0.10)

    // quadratic bezier: rises slightly then flattens to ground
    const cpX = cx + Math.cos(angle) * maxLen * 0.42 + (rand() - 0.5) * W * 0.07
    const cpY = floor - H * 0.055 - rand() * H * 0.04

    const endX = cx + Math.cos(angle) * maxLen
    const endY = floor - H * 0.008 + (rand() - 0.5) * H * 0.018

    // Level-2 sub-roots
    const subs = []
    const nSubs = rand() > 0.35 ? 2 : 1
    for (let j = 0; j < nSubs; j++) {
      const st = 0.38 + rand() * 0.34        // split along parent
      const bx = lerp(lerp(cx, cpX, st), lerp(cpX, endX, st), st)
      const by = lerp(lerp(floor, cpY, st), lerp(cpY, endY, st), st)
      const sa = angle + (rand() - 0.5) * 1.1
      const sl = maxLen * (0.20 + rand() * 0.18)

      // Level-3 sub-sub-roots
      const subsubs = []
      if (rand() > 0.55) {
        const ex3 = bx + Math.cos(sa + (rand()-0.5)*0.8) * sl * 0.55
        const ey3 = by + Math.sin(Math.abs(sa)*0.15) * sl * 0.12
        subsubs.push({ ox:bx+(ex3-bx)*0.4, oy:by+(ey3-by)*0.4, ex:ex3, ey:ey3 })
      }

      subs.push({
        ox: bx, oy: by,
        ex: bx + Math.cos(sa) * sl,
        ey: by + Math.sin(Math.abs(sa) * 0.18) * sl * 0.14,
        t: st, subsubs,
      })
    }

    roots.push({ cx, floor, cpX, cpY, endX, endY, subs, angle, maxLen })
  }

  /* ── TRUNK ─────────────────────────────────────────────── */
  const trunkH = H * 0.46
  const trunk  = {
    x0:    cx,         y0: floor,
    x1:    cx + W*0.012, y1: floor - trunkH,
    wBase: W * 0.078,
    wTop:  W * 0.027,
  }

  /* ── BRANCHES ───────────────────────────────────────────── */
  function branch(ox, oy, angle, len, depth) {
    if (depth === 0 || len < W * 0.014) return []
    const ex  = ox + Math.cos(angle) * len
    const ey  = oy + Math.sin(angle) * len
    const sp  = 0.38 + rand() * 0.22
    const lr  = 0.60 + rand() * 0.10
    return [
      { ox, oy, ex, ey, depth, w: Math.max(1.2, depth * 2.5) },
      ...branch(ex, ey, angle - sp, len * lr, depth - 1),
      ...branch(ex, ey, angle + sp, len * lr, depth - 1),
    ]
  }

  const bY = trunk.y1 + H * 0.035   // branch origin (just above trunk top)
  const branches = [
    ...branch(cx,          bY,          -Math.PI / 2,     W * 0.15, 6),
    ...branch(cx,          bY+H*0.04,   -Math.PI * 0.74,  W * 0.17, 6),
    ...branch(cx,          bY+H*0.04,   -Math.PI * 0.26,  W * 0.17, 6),
    ...branch(cx-W*0.015,  bY+H*0.10,   -Math.PI * 0.84,  W * 0.13, 5),
    ...branch(cx+W*0.015,  bY+H*0.10,   -Math.PI * 0.16,  W * 0.13, 5),
    ...branch(cx,          bY+H*0.16,   -Math.PI * 0.68,  W * 0.10, 4),
    ...branch(cx,          bY+H*0.16,   -Math.PI * 0.32,  W * 0.10, 4),
  ]

  /* ── LEAF CLUSTERS ──────────────────────────────────────── */
  const leaves = []
  branches.forEach(b => {
    if (b.depth <= 2) {
      const n = b.depth === 1 ? 4 : 2
      for (let i = 0; i < n; i++) {
        leaves.push({
          x: b.ex + (rand()-0.5)*W*0.05,
          y: b.ey + (rand()-0.5)*H*0.04,
          rx: W*(0.028+rand()*0.048),
          ry: H*(0.020+rand()*0.034),
          layer: Math.floor(rand()*4),
        })
      }
    }
  })
  // Dense canopy fill at crown
  for (let i = 0; i < 48; i++) {
    const a  = rand() * Math.PI * 2
    const r  = rand() * W * 0.26
    leaves.push({
      x: cx + Math.cos(a) * r,
      y: bY - H*0.10 + Math.sin(a) * r * 0.52,
      rx: W*(0.028+rand()*0.060),
      ry: H*(0.020+rand()*0.042),
      layer: Math.floor(rand()*4),
    })
  }

  /* ── FIREFLY PARTICLES ──────────────────────────────────── */
  const particles = Array.from({ length: 80 }, () => ({
    x:     cx + (rand()-0.5) * W * 0.95,
    y:     floor - rand() * H * 0.80,
    r:     0.8 + rand() * 2.8,
    speed: 0.12 + rand() * 0.45,
    phase: rand() * Math.PI * 2,
    hue:   rand() > 0.7 ? 120 : 185,   // mix of green + cyan
  }))

  return { roots, trunk, branches, leaves, particles, cx, floor, W, H, bY }
}

/* ═══════════════════════════════════════════════════════════════
   DRAW  — called every frame
═══════════════════════════════════════════════════════════════ */
function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo=0, hi=1) { return Math.min(hi, Math.max(lo, v)) }
function easeOut(t) { return 1 - Math.pow(1-t, 3) }
function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2 }

// Draw bezier path up to `progress` (0-1)
function bezierProgress(ctx, x0,y0, cpX,cpY, x1,y1, p, N=60) {
  if (p <= 0) return false
  const n = Math.max(1, Math.round(N * p))
  ctx.beginPath(); ctx.moveTo(x0, y0)
  for (let i = 1; i <= n; i++) {
    const t = i/N, mt = 1-t
    ctx.lineTo(mt*mt*x0 + 2*mt*t*cpX + t*t*x1, mt*mt*y0 + 2*mt*t*cpY + t*t*y1)
  }
  return true
}

function drawFrame(ctx, geo, progress, time) {
  const { roots, trunk, branches, leaves, particles, cx, floor, W, H, bY } = geo

  /* BACKGROUND ─────────────────────────────────────────── */
  ctx.clearRect(0, 0, W, H)
  const bg = ctx.createRadialGradient(cx, H*0.42, 0, cx, H*0.42, W*0.85)
  bg.addColorStop(0,   '#051e30')
  bg.addColorStop(0.5, '#02101c')
  bg.addColorStop(1,   '#010608')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  /* GROUND GLOW PUDDLE ─────────────────────────────────── */
  const gp = ctx.createRadialGradient(cx, floor, 0, cx, floor, W*0.60)
  gp.addColorStop(0,   'rgba(0,200,255,0.16)')
  gp.addColorStop(0.35,'rgba(0,140,220,0.08)')
  gp.addColorStop(1,   'transparent')
  ctx.fillStyle = gp
  ctx.fillRect(0, floor-80, W, H - floor + 80)

  /* Phase windows (each feature animates in its own window) */
  const rootP   = easeInOut(clamp((progress - 0.00) / 0.42))
  const trunkP  = easeInOut(clamp((progress - 0.18) / 0.46))
  const branchP = easeOut(  clamp((progress - 0.50) / 0.38))
  const canopyP = easeOut(  clamp((progress - 0.74) / 0.26))
  const partP   =            clamp((progress - 0.58) / 0.42)

  /* ── ROOTS ───────────────────────────────────────────── */
  roots.forEach((root, i) => {
    const stag = (i / roots.length) * 0.38
    const rp   = clamp((rootP - stag) / (1 - stag))
    if (rp <= 0) return

    // MAIN ROOT — 4 bloom passes
    const drawn = bezierProgress(ctx, root.cx, root.floor, root.cpX, root.cpY, root.endX, root.endY, rp)
    if (!drawn) return
    ctx.save(); ctx.lineCap = 'round'
    ctx.shadowColor='#00CCFF'; ctx.shadowBlur=70; ctx.strokeStyle='rgba(0,160,255,0.12)'; ctx.lineWidth=14; ctx.stroke()
    ctx.shadowBlur=32; ctx.strokeStyle='rgba(0,200,255,0.28)'; ctx.lineWidth=7;  ctx.stroke()
    ctx.shadowBlur=14; ctx.strokeStyle='rgba(0,220,255,0.55)'; ctx.lineWidth=3;  ctx.stroke()
    ctx.shadowColor='#bbf0ff'; ctx.shadowBlur=4; ctx.strokeStyle='rgba(200,245,255,0.92)'; ctx.lineWidth=1.2; ctx.stroke()
    ctx.restore()

    // LEVEL-2 SUB-ROOTS
    root.subs.forEach(sub => {
      const sp = clamp((rp - sub.t) / (1 - sub.t))
      if (sp <= 0) return
      const ex = lerp(sub.ox, sub.ex, sp), ey = lerp(sub.oy, sub.ey, sp)
      ctx.save(); ctx.lineCap='round'
      ctx.beginPath(); ctx.moveTo(sub.ox, sub.oy); ctx.lineTo(ex, ey)
      ctx.shadowColor='#00CCFF'; ctx.shadowBlur=35; ctx.strokeStyle='rgba(0,190,255,0.22)'; ctx.lineWidth=7;  ctx.stroke()
      ctx.shadowBlur=12; ctx.strokeStyle='rgba(160,235,255,0.88)'; ctx.lineWidth=1.1; ctx.stroke()
      ctx.restore()

      // LEVEL-3 SUB-SUB-ROOTS
      sub.subsubs.forEach(ss => {
        const ssp = clamp((sp - 0.45) / 0.55)
        if (ssp <= 0) return
        const ex3 = lerp(ss.ox, ss.ex, ssp), ey3 = lerp(ss.oy, ss.ey, ssp)
        ctx.save(); ctx.lineCap='round'
        ctx.beginPath(); ctx.moveTo(ss.ox, ss.oy); ctx.lineTo(ex3, ey3)
        ctx.shadowColor='#00CCFF'; ctx.shadowBlur=18; ctx.strokeStyle='rgba(0,180,255,0.30)'; ctx.lineWidth=4;  ctx.stroke()
        ctx.shadowBlur=5;  ctx.strokeStyle='rgba(140,225,255,0.80)'; ctx.lineWidth=0.8; ctx.stroke()
        ctx.restore()
      })
    })
  })

  /* ── TRUNK ───────────────────────────────────────────── */
  if (trunkP > 0) {
    const tx1 = lerp(trunk.x0, trunk.x1, trunkP)
    const ty1 = lerp(trunk.y0, trunk.y1, trunkP)
    const wB  = trunk.wBase
    const wT  = lerp(wB, trunk.wTop, trunkP)

    // Main trunk silhouette
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(trunk.x0 - wB/2, trunk.y0)
    ctx.bezierCurveTo(
      tx1 - wT*1.1, ty1 + (ty1-trunk.y0)*0.35,
      tx1 - wT*1.0, ty1 + (ty1-trunk.y0)*0.15,
      tx1 - wT/2, ty1
    )
    ctx.lineTo(tx1 + wT/2, ty1)
    ctx.bezierCurveTo(
      tx1 + wT*1.0, ty1 + (ty1-trunk.y0)*0.15,
      tx1 + wT*1.1, ty1 + (ty1-trunk.y0)*0.35,
      trunk.x0 + wB/2, trunk.y0
    )
    ctx.closePath()
    ctx.fillStyle = '#080502'
    ctx.fill()

    // Bark texture — vertical streaks
    for (let i = 0; i < 8; i++) {
      const xOff = (i/7 - 0.5) * wB * 0.85
      const xa   = trunk.x0 + xOff
      const xb   = tx1 + xOff * (wT/wB) * 0.6
      ctx.beginPath(); ctx.moveTo(xa, trunk.y0); ctx.lineTo(xb, ty1)
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(30,18,8,0.45)' : 'rgba(20,10,4,0.30)'
      ctx.lineWidth = 3 + (1-Math.abs(i/7-0.5)*2)*4
      ctx.shadowBlur = 0; ctx.stroke()
    }

    // Canopy ambient glow on trunk
    ctx.shadowColor = '#1a5a1a'; ctx.shadowBlur = 30
    ctx.strokeStyle = 'rgba(10,30,10,0.0)'; ctx.lineWidth = wB * 0.12
    ctx.beginPath(); ctx.moveTo(trunk.x0, trunk.y0); ctx.lineTo(tx1, ty1)
    ctx.stroke()
    ctx.restore()
  }

  /* ── BRANCHES ────────────────────────────────────────── */
  if (branchP > 0) {
    const sorted = [...branches].sort((a, b) => b.depth - a.depth)
    sorted.forEach((b, i) => {
      const stag = (i / sorted.length) * 0.45
      const bp   = clamp((branchP - stag) / (1 - stag))
      if (bp <= 0) return
      const ex = lerp(b.ox, b.ex, bp), ey = lerp(b.oy, b.ey, bp)
      ctx.save(); ctx.lineCap = 'round'
      // thick bark
      ctx.shadowColor='#0a0502'; ctx.shadowBlur=6
      ctx.strokeStyle='#0c0804'; ctx.lineWidth=b.w+2
      ctx.beginPath(); ctx.moveTo(b.ox, b.oy); ctx.lineTo(ex, ey); ctx.stroke()
      // edge detail
      ctx.strokeStyle='rgba(25,14,5,0.5)'; ctx.lineWidth=1; ctx.shadowBlur=0
      ctx.stroke()
      ctx.restore()
    })
  }

  /* ── CANOPY ──────────────────────────────────────────── */
  if (canopyP > 0) {
    // 4 leaf layers, dark→bright
    const lc = [
      { fill:'rgba(4,20,4,0.88)',   shadow: null,       sr: 0 },
      { fill:'rgba(10,42,10,0.85)', shadow: null,       sr: 0 },
      { fill:'rgba(18,70,18,0.80)', shadow:'#0d3d0d',   sr: 14 },
      { fill:'rgba(28,96,28,0.75)', shadow:'#1a6a1a',   sr: 24 },
    ]

    ;[0,1,2,3].forEach(layer => {
      const col = lc[layer]
      leaves.filter(l => l.layer === layer).forEach((leaf, li) => {
        const stag = (li / leaves.length) * 0.55
        const lp   = clamp((canopyP - stag) / (1 - stag))
        if (lp <= 0) return
        ctx.save()
        if (col.shadow) { ctx.shadowColor = col.shadow; ctx.shadowBlur = col.sr }
        ctx.beginPath()
        ctx.ellipse(leaf.x, leaf.y, leaf.rx * lp, leaf.ry * lp, 0, 0, Math.PI * 2)
        ctx.fillStyle = col.fill; ctx.fill()
        ctx.restore()
      })
    })

    // Green crown atmospheric glow
    const cg = ctx.createRadialGradient(cx, bY - H*0.09, 0, cx, bY - H*0.09, W*0.32)
    cg.addColorStop(0,   'rgba(18,72,18,0.0)')
    cg.addColorStop(0.55,'rgba(14,62,14,0.18)')
    cg.addColorStop(1,   'transparent')
    ctx.save(); ctx.globalAlpha = canopyP * 0.9
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H); ctx.restore()
  }

  /* ── FIREFLY PARTICLES ───────────────────────────────── */
  if (partP > 0) {
    particles.forEach(p => {
      const drift = (time * p.speed * 20) % (floor * 0.92)
      const py    = p.y - drift
      if (py < 5 || py > floor) return
      const alpha = partP * (0.25 + 0.5 * Math.sin(time * 1.4 + p.phase)) * (py > floor*0.7 ? 1 : py/(floor*0.7))
      ctx.save()
      ctx.shadowColor = p.hue === 185 ? '#00CCFF' : '#22CC44'
      ctx.shadowBlur  = 12
      ctx.fillStyle   = p.hue === 185 ? `rgba(80,220,255,${alpha})` : `rgba(80,220,100,${alpha})`
      ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    })
  }

  /* VIGNETTE ──────────────────────────────────────────── */
  const vg = ctx.createRadialGradient(cx, H*0.5, H*0.22, cx, H*0.5, H*0.82)
  vg.addColorStop(0, 'transparent')
  vg.addColorStop(1, 'rgba(1,3,6,0.80)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
}

/* ═══════════════════════════════════════════════════════════════
   CANVAS COMPONENT
═══════════════════════════════════════════════════════════════ */
function TreeCanvas() {
  const canvasRef = useRef(null)
  const geoRef    = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr    = window.devicePixelRatio || 1

    const resize = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      canvas.width  = W * dpr; canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      geoRef.current = buildTree(W, H)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let startT = null
    const GROW_DURATION = 4.2   // seconds for full tree to appear

    const tick = (ts) => {
      if (!startT) startT = ts
      const elapsed  = (ts - startT) / 1000
      const progress = clamp(elapsed / GROW_DURATION)
      const ctx = canvas.getContext('2d')
      ctx.save()
      drawFrame(ctx, geoRef.current, progress, elapsed)
      ctx.restore()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height:'100%', display:'block' }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   LOGO  (inline SVG — swap src="" for your real logo image)
═══════════════════════════════════════════════════════════════ */
function Logo() {
  return (
    <div style={s.logo}>
      {/* Replace with: <img src="/logo.png" alt="Kasratshala" style={{height:38}} /> */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        {/* trunk */}
        <rect x="15.5" y="18" width="5" height="14" rx="2" fill="#5C2810"/>
        {/* left branch */}
        <path d="M18 20 Q10 16 6 10" stroke="#5C2810" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* right branch */}
        <path d="M18 20 Q26 16 30 10" stroke="#5C2810" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* canopy */}
        <ellipse cx="18"  cy="10" rx="9"  ry="7"  fill="#2E7B2E"/>
        <ellipse cx="10"  cy="13" rx="6"  ry="5"  fill="#2E7B2E"/>
        <ellipse cx="26"  cy="13" rx="6"  ry="5"  fill="#2E7B2E"/>
        <ellipse cx="18"  cy="8"  rx="7"  ry="5.5" fill="#3D8C3D"/>
        {/* aerial roots */}
        <path d="M10 17 Q10 22 10 26" stroke="#7A4520" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
        <path d="M26 17 Q26 22 26 26" stroke="#7A4520" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
      </svg>
      <div style={s.logoText}>
        <span style={s.logoMain}>KASRAT</span>
        <span style={s.logoSub}>SHALA</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════════════════════ */
const NAV_PAGES = ['Home', 'Courses', 'Workshops', 'Camps', 'Connect']

function Nav() {
  const [active, setActive] = useState('Home')
  return (
    <nav style={s.nav}>
      {NAV_PAGES.map((page, i) => (
        <motion.button
          key={page}
          style={{ ...s.navBtn, ...(active===page ? s.navActive : {}) }}
          onClick={() => setActive(page)}
          initial={{ opacity:0, x:-14 }}
          animate={{ opacity:1, x:0 }}
          transition={{ delay: 0.4 + i*0.07, duration:0.5, ease:[0.16,1,0.3,1] }}
          whileHover={{ x:4, color:'#D4A853' }}
        >
          {active===page && <span style={s.navDot}/>}
          {page}
        </motion.button>
      ))}
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HERO TEXT
═══════════════════════════════════════════════════════════════ */
const ease = { ease:[0.16,1,0.3,1], duration:0.95 }

function HeroText() {
  return (
    <motion.div
      style={s.heroText}
      initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.13, delayChildren:0.7 } } }}
    >
      {/* Sanskrit */}
      <motion.p
        style={s.sanskrit}
        variants={{ hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:ease} }}
      >
        शरीरं आद्यं मन्दिरम् · चलनं प्रार्थना
      </motion.p>

      {/* Main headline — clip reveal */}
      <h1 style={{ margin:0 }}>
        {['Movement', 'Arts', 'Dojo'].map((word, i) => (
          <span key={word} style={s.clip}>
            <motion.span
              style={{ ...s.word, ...(i===2 ? s.wordAccent : {}) }}
              variants={{
                hidden: { y:'115%' },
                show:   { y:'0%', transition:{ ease:[0.16,1,0.3,1], duration:1.05, delay:i*0.10 } }
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </h1>

      {/* Rule */}
      <motion.div
        style={s.rule}
        variants={{ hidden:{scaleX:0}, show:{scaleX:1,transition:{ease:'easeInOut',duration:0.7}} }}
      />

      {/* Location */}
      <motion.p
        style={s.location}
        variants={{ hidden:{opacity:0}, show:{opacity:1,transition:{duration:0.6}} }}
      >
        Naggar, Himachal Pradesh · 1,890 m
      </motion.p>

      {/* Badges */}
      <motion.div
        style={s.badges}
        variants={{ hidden:{opacity:0}, show:{opacity:1,transition:{duration:0.5}} }}
      >
        <span style={{...s.badge, borderColor:'rgba(212,168,83,.35)', color:'#D4A853'}}>◦ Gurukul Tradition</span>
        <span style={{...s.badge, borderColor:'rgba(61,140,61,.35)',  color:'#3D8C3D'}}>◦ Steel Mace · Rope · Kettlebell</span>
      </motion.div>

      {/* CTAs */}
      <motion.div
        style={s.btns}
        variants={{ hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.5}} }}
      >
        <motion.button
          style={s.btnPrimary}
          whileHover={{ y:-3, boxShadow:'0 12px 38px rgba(168,48,48,.65)' }}
          whileTap={{ scale:0.97 }}
        >
          Begin Your Sadhana
        </motion.button>
        <motion.button
          style={s.btnGhost}
          whileHover={{ y:-3, borderColor:'rgba(212,168,83,.55)', color:'#D4A853' }}
          whileTap={{ scale:0.97 }}
        >
          View Courses
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL INDICATOR
═══════════════════════════════════════════════════════════════ */
function ScrollHint() {
  return (
    <motion.div
      style={s.scroll}
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      transition={{ delay:4.8, duration:0.9 }}
    >
      <span style={s.scrollLabel}>Scroll</span>
      <motion.div
        style={s.scrollBar}
        animate={{ scaleY:[0.5,1,0.5], opacity:[0.2,1,0.2] }}
        transition={{ duration:2.6, ease:'easeInOut', repeat:Infinity }}
      />
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function App() {
  // Mouse parallax → drives 3D tilt of tree panel
  const rawX  = useMotionValue(0)
  const rawY  = useMotionValue(0)
  const rotY  = useSpring(rawX, { stiffness:40, damping:25 })
  const rotX  = useSpring(rawY, { stiffness:40, damping:25 })

  const onMove = (e) => {
    const rx = (e.clientX / window.innerWidth  - 0.5) *  14   // ±7°
    const ry = (e.clientY / window.innerHeight - 0.5) * -8    // ±4°
    rawX.set(rx); rawY.set(ry)
  }

  return (
    <div style={s.root} onMouseMove={onMove}>

      {/* ── LEFT PANEL ──────────────────────────── */}
      <motion.div
        style={s.left}
        initial={{ opacity:0, x:-24 }}
        animate={{ opacity:1, x:0 }}
        transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}
      >
        <Logo />
        <Nav />
        <HeroText />
      </motion.div>

      {/* ── RIGHT PANEL — 3D Tree ───────────────── */}
      <div style={s.right}>
        {/* Intro swing: right → front (rotateY -42 → 0), then mouse parallax takes over */}
        <motion.div
          style={{ ...s.treeStage, rotateY, rotateX }}
          initial={{ rotateY:-42, x:'14%', opacity:0 }}
          animate={{ rotateY:0,   x:'0%',  opacity:1 }}
          transition={{
            rotateY: { type:'spring', stiffness:20, damping:16, delay:0.15 },
            x:       { type:'spring', stiffness:22, damping:18, delay:0.15 },
            opacity: { duration:0.7, delay:0.10 },
          }}
        >
          {/* Idle float after intro */}
          <motion.div
            style={{ width:'100%', height:'100%' }}
            animate={{ y:[0,-16,0] }}
            transition={{ duration:6, ease:'easeInOut', repeat:Infinity, delay:4.5 }}
          >
            <TreeCanvas />
          </motion.div>
        </motion.div>
      </div>

      <ScrollHint />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   Swap for Tailwind classes / CSS Modules as you prefer.
═══════════════════════════════════════════════════════════════ */
const s = {
  root: {
    position:'relative', width:'100vw', height:'100vh',
    display:'flex', overflow:'hidden',
    background:'#020810', color:'#F0E6DC',
    fontFamily:'Georgia, "Times New Roman", serif',
  },

  /* Left panel */
  left: {
    position:'relative', zIndex:20,
    width:'38%', minWidth:300,
    display:'flex', flexDirection:'column',
    padding:'2.4rem 0 2.4rem 5vw',
    borderRight:'1px solid rgba(107,26,26,0.18)',
    background:'linear-gradient(100deg, rgba(8,4,2,0.82) 0%, transparent 100%)',
    backdropFilter:'blur(2px)',
  },

  /* Logo */
  logo: {
    display:'flex', alignItems:'center', gap:'0.7rem',
    marginBottom:'2.6rem',
  },
  logoText: { display:'flex', flexDirection:'column', lineHeight:1 },
  logoMain: { fontSize:'1.05rem', fontWeight:700, letterSpacing:'.14em', color:'#F0E6DC' },
  logoSub:  { fontSize:'0.78rem', fontWeight:400, letterSpacing:'.22em', color:'#A83030' },

  /* Nav */
  nav: {
    display:'flex', flexDirection:'column', gap:'0.18rem',
    marginBottom:'auto',      // pushes hero text toward vertical center
    paddingBottom:'1rem',
  },
  navBtn: {
    position:'relative',
    background:'none', border:'none', cursor:'pointer',
    color:'#9A8878', fontSize:'.82rem', fontFamily:'system-ui,sans-serif',
    letterSpacing:'.10em', textTransform:'uppercase',
    padding:'.44rem 0', textAlign:'left',
    display:'flex', alignItems:'center', gap:'0.55rem',
    transition:'color .2s',
  },
  navActive: { color:'#F0E6DC' },
  navDot: {
    display:'inline-block', width:5, height:5,
    borderRadius:'50%', background:'#A83030', flexShrink:0,
  },

  /* Hero text */
  heroText: {
    display:'flex', flexDirection:'column',
    paddingRight:'2rem', paddingBottom:'1rem',
  },
  sanskrit: {
    fontSize:'clamp(.70rem,.95vw,.88rem)', color:'#D4A853',
    letterSpacing:'.16em', marginBottom:'1.8rem',
  },
  clip: {
    display:'block', overflow:'hidden',
    lineHeight:0.88, marginBottom:'.04em',
  },
  word: {
    display:'block',
    fontSize:'clamp(2.8rem,6.5vw,6rem)',
    fontWeight:700, letterSpacing:'-.025em', color:'#F0E6DC',
  },
  wordAccent: { color:'#A83030' },
  rule: {
    height:1, transformOrigin:'left',
    background:'linear-gradient(90deg,#A83030,#D4A853 55%,transparent)',
    margin:'1.5rem 0 1.4rem',
  },
  location: {
    fontSize:'clamp(.72rem,1.0vw,.88rem)', color:'#9A8878',
    letterSpacing:'.10em', textTransform:'uppercase', marginBottom:'1.8rem',
  },
  badges: { display:'flex', gap:'.55rem', flexWrap:'wrap', marginBottom:'2.2rem' },
  badge: {
    padding:'.28rem .8rem', borderRadius:100, fontSize:'.62rem',
    letterSpacing:'.11em', textTransform:'uppercase',
    border:'1px solid', fontFamily:'system-ui,sans-serif',
  },
  btns: { display:'flex', gap:'.8rem', flexWrap:'wrap' },
  btnPrimary: {
    padding:'.7rem 1.7rem', borderRadius:3, fontSize:'.76rem',
    letterSpacing:'.12em', textTransform:'uppercase', cursor:'pointer',
    border:'none', fontFamily:'system-ui,sans-serif',
    background:'#A83030', color:'#F0E6DC',
    boxShadow:'0 4px 24px rgba(107,26,26,.48)',
    transition:'box-shadow .2s',
  },
  btnGhost: {
    padding:'.7rem 1.7rem', borderRadius:3, fontSize:'.76rem',
    letterSpacing:'.12em', textTransform:'uppercase', cursor:'pointer',
    fontFamily:'system-ui,sans-serif', background:'transparent',
    color:'#9A8878', border:'1px solid rgba(240,230,220,.14)',
    transition:'color .2s, border-color .2s',
  },

  /* Right panel */
  right: {
    flex:1, position:'relative',
    perspective:'1200px', perspectiveOrigin:'50% 50%',
  },
  treeStage: {
    width:'100%', height:'100%',
    transformStyle:'preserve-3d',
  },

  /* Scroll hint */
  scroll: {
    position:'absolute', bottom:'2rem', left:'50%',
    transform:'translateX(-50%)',
    display:'flex', flexDirection:'column', alignItems:'center', gap:'.4rem',
    zIndex:30,
  },
  scrollLabel: {
    fontSize:'.56rem', letterSpacing:'.24em', textTransform:'uppercase',
    color:'#9A8878', fontFamily:'system-ui,sans-serif',
  },
  scrollBar: {
    width:1, height:44,
    background:'linear-gradient(180deg,#D4A853,transparent)',
    transformOrigin:'top',
  },
}
