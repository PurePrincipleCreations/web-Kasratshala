// npm install framer-motion
// Drop this file into any React project and import it:
// import TreeHero from './TreeHero'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/* ── Seeded RNG (same tree shape every render) ── */
function makeRng(seed = 7) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/* ── Build tree geometry once ── */
function buildTree(W, H) {
  const rng = makeRng(7)
  const cx = W * 0.5
  const groundY = H * 0.70

  // Roots
  const roots = []
  for (let i = 0; i < 18; i++) {
    const t = i / 17
    const angle = (t - 0.5) * Math.PI * 1.65
    const len = W * (0.28 + rng() * 0.22)
    const cpX = cx + Math.cos(angle) * len * 0.45 + (rng() - 0.5) * W * 0.08
    const cpY = groundY - H * 0.04 - rng() * H * 0.05
    const endX = cx + Math.cos(angle) * len
    const endY = groundY - H * 0.01 + (rng() - 0.5) * H * 0.025

    const subs = []
    const subCount = rng() > 0.5 ? 2 : 1
    for (let j = 0; j < subCount; j++) {
      const st = 0.42 + rng() * 0.30
      const bx = lerp(lerp(cx, cpX, st), lerp(cpX, endX, st), st)
      const by = lerp(lerp(groundY, cpY, st), lerp(cpY, endY, st), st)
      const sa = angle + (rng() - 0.5) * 0.9
      const sl = len * (0.22 + rng() * 0.18)
      subs.push({ ox: bx, oy: by, ex: bx + Math.cos(sa) * sl, ey: by + Math.sin(Math.abs(sa) * 0.2) * sl * 0.15, t: st })
    }
    roots.push({ cx, groundY, cpX, cpY, endX, endY, subs })
  }

  // Trunk
  const trunk = { x0: cx, y0: groundY, x1: cx + W * 0.01, y1: groundY - H * 0.45, wBase: W * 0.065, wTop: W * 0.025 }

  // Branches (recursive)
  function branch(ox, oy, angle, len, depth) {
    if (depth === 0 || len < W * 0.018) return []
    const ex = ox + Math.cos(angle) * len
    const ey = oy + Math.sin(angle) * len
    const sp = 0.42 + rng() * 0.18
    return [
      { ox, oy, ex, ey, depth, w: Math.max(1, depth * 2.2) },
      ...branch(ex, ey, angle - sp, len * (0.62 + rng() * 0.08), depth - 1),
      ...branch(ex, ey, angle + sp, len * (0.62 + rng() * 0.08), depth - 1),
    ]
  }
  const bOriY = trunk.y1 + H * 0.04
  const branches = [
    ...branch(cx,           bOriY,          -Math.PI / 2,    W * 0.14, 5),
    ...branch(cx,           bOriY + H*0.05, -Math.PI * 0.72, W * 0.16, 5),
    ...branch(cx,           bOriY + H*0.05, -Math.PI * 0.28, W * 0.16, 5),
    ...branch(cx - W*0.01,  bOriY + H*0.12, -Math.PI * 0.82, W * 0.12, 4),
    ...branch(cx + W*0.01,  bOriY + H*0.12, -Math.PI * 0.18, W * 0.12, 4),
  ]

  // Leaves
  const leaves = []
  branches.forEach(b => {
    if (b.depth <= 2) {
      const count = b.depth === 1 ? 3 : 1
      for (let i = 0; i < count; i++) {
        leaves.push({ x: b.ex + (rng()-0.5)*W*0.04, y: b.ey + (rng()-0.5)*H*0.03, r: W*(0.025+rng()*0.04), layer: Math.floor(rng()*3) })
      }
    }
  })
  for (let i = 0; i < 28; i++) {
    const a = rng() * Math.PI * 2
    const r = rng() * W * 0.22
    leaves.push({ x: cx + Math.cos(a)*r, y: bOriY - H*0.12 + Math.sin(a)*r*0.55, r: W*(0.03+rng()*0.055), layer: Math.floor(rng()*3) })
  }

  // Particles
  const particles = Array.from({ length: 60 }, () => ({
    x: cx + (rng()-0.5)*W*0.9, y: groundY - rng()*H*0.82,
    r: 1 + rng()*2.5, speed: 0.15 + rng()*0.4, phase: rng()*Math.PI*2,
  }))

  return { roots, trunk, branches, leaves, particles, cx, groundY, W, H }
}

/* ── Helpers ── */
function lerp(a, b, t) { return a + (b - a) * t }
function clamp01(v)    { return Math.min(1, Math.max(0, v)) }
function easeOut(t)    { return 1 - Math.pow(1 - t, 3) }
function easeInOut(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }

function bezierProg(ctx, x0, y0, cpX, cpY, x1, y1, p, segs=50) {
  if (p <= 0) return
  const n = Math.max(1, Math.round(segs * p))
  ctx.beginPath(); ctx.moveTo(x0, y0)
  for (let i = 1; i <= n; i++) {
    const t = i / segs, mt = 1 - t
    ctx.lineTo(mt*mt*x0 + 2*mt*t*cpX + t*t*x1, mt*mt*y0 + 2*mt*t*cpY + t*t*y1)
  }
}

/* ── Main draw function ── */
function drawTree(ctx, geo, progress, time) {
  const { roots, trunk, branches, leaves, particles, cx, groundY, W, H } = geo

  // Background
  ctx.clearRect(0, 0, W, H)
  const bg = ctx.createRadialGradient(cx, H*0.45, 0, cx, H*0.45, W*0.75)
  bg.addColorStop(0, '#041828'); bg.addColorStop(0.5, '#020D18'); bg.addColorStop(1, '#010608')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // Ground glow
  const gg = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, W*0.55)
  gg.addColorStop(0, 'rgba(0,180,255,0.12)'); gg.addColorStop(0.4, 'rgba(0,100,200,0.06)'); gg.addColorStop(1, 'transparent')
  ctx.fillStyle = gg; ctx.fillRect(0, groundY-40, W, H-groundY+40)

  // Phase windows
  const rootP   = easeInOut(clamp01((progress - 0.00) / 0.45))
  const trunkP  = easeInOut(clamp01((progress - 0.20) / 0.48))
  const branchP = easeOut(  clamp01((progress - 0.52) / 0.38))
  const canopyP = easeOut(  clamp01((progress - 0.76) / 0.24))
  const partP   =            clamp01((progress - 0.60) / 0.40)

  // ── Roots ──────────────────────────────────────────────────────
  roots.forEach((root, i) => {
    const stag = i / roots.length * 0.35
    const rp = clamp01((rootP - stag) / (1 - stag))
    if (rp <= 0) return
    const CYAN = '#00CCFF'

    bezierProg(ctx, root.cx, root.groundY, root.cpX, root.cpY, root.endX, root.endY, rp)
    ctx.save(); ctx.shadowColor=CYAN; ctx.shadowBlur=55; ctx.strokeStyle='rgba(0,180,255,0.18)'; ctx.lineWidth=9; ctx.stroke(); ctx.restore()
    ctx.save(); ctx.shadowColor=CYAN; ctx.shadowBlur=22; ctx.strokeStyle='rgba(0,210,255,0.40)'; ctx.lineWidth=4; ctx.stroke(); ctx.restore()
    ctx.save(); ctx.shadowColor='#aaeeff'; ctx.shadowBlur=6; ctx.strokeStyle='rgba(180,240,255,0.90)'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore()

    root.subs.forEach(sub => {
      const sp = clamp01((rp - sub.t) / (1 - sub.t))
      if (sp <= 0) return
      ctx.beginPath(); ctx.moveTo(sub.ox, sub.oy); ctx.lineTo(lerp(sub.ox,sub.ex,sp), lerp(sub.oy,sub.ey,sp))
      ctx.save(); ctx.shadowColor=CYAN; ctx.shadowBlur=30; ctx.strokeStyle='rgba(0,200,255,0.25)'; ctx.lineWidth=5; ctx.stroke(); ctx.restore()
      ctx.save(); ctx.shadowColor=CYAN; ctx.shadowBlur=8;  ctx.strokeStyle='rgba(150,230,255,0.85)'; ctx.lineWidth=1.2; ctx.stroke(); ctx.restore()
    })
  })

  // ── Trunk ──────────────────────────────────────────────────────
  if (trunkP > 0) {
    const t1x = lerp(trunk.x0, trunk.x1, trunkP)
    const t1y = lerp(trunk.y0, trunk.y1, trunkP)
    const wB = trunk.wBase, wT = lerp(wB, trunk.wTop, trunkP)
    ctx.beginPath()
    ctx.moveTo(trunk.x0 - wB/2, trunk.y0)
    ctx.quadraticCurveTo(t1x - wT*0.9, t1y+(t1y-trunk.y0)*0.05, t1x - wT/2, t1y)
    ctx.lineTo(t1x + wT/2, t1y)
    ctx.quadraticCurveTo(t1x + wT*0.9, t1y+(t1y-trunk.y0)*0.05, trunk.x0 + wB/2, trunk.y0)
    ctx.closePath()
    ctx.fillStyle = '#0a0804'; ctx.fill()
    ctx.save(); ctx.shadowColor='#1a4a1a'; ctx.shadowBlur=18; ctx.strokeStyle='#1a1008'; ctx.lineWidth=wB*0.08
    ctx.beginPath(); ctx.moveTo(trunk.x0-wB/2+2, trunk.y0); ctx.lineTo(t1x-wT/2+1, t1y); ctx.stroke(); ctx.restore()
  }

  // ── Branches ───────────────────────────────────────────────────
  if (branchP > 0) {
    const sorted = [...branches].sort((a,b) => b.depth - a.depth)
    sorted.forEach((b, i) => {
      const stag = i / sorted.length * 0.40
      const bp = clamp01((branchP - stag) / (1 - stag))
      if (bp <= 0) return
      ctx.save(); ctx.lineCap='round'
      ctx.strokeStyle='#100a04'; ctx.lineWidth=b.w+1; ctx.shadowColor='#1a1008'; ctx.shadowBlur=4
      ctx.beginPath(); ctx.moveTo(b.ox, b.oy); ctx.lineTo(lerp(b.ox,b.ex,bp), lerp(b.oy,b.ey,bp))
      ctx.stroke(); ctx.restore()
    })
  }

  // ── Canopy ─────────────────────────────────────────────────────
  if (canopyP > 0) {
    const cols = [
      { fill:'rgba(8,28,8,0.85)',   glow: null },
      { fill:'rgba(18,68,18,0.80)', glow: null },
      { fill:'rgba(28,96,28,0.75)', glow:'#1a6a1a' },
    ]
    ;[0,1,2].forEach(layer => {
      const col = cols[layer]
      leaves.filter(l => l.layer === layer).forEach((leaf, li) => {
        const stag = li / leaves.length * 0.5
        const lp = clamp01((canopyP - stag) / (1 - stag))
        if (lp <= 0) return
        ctx.save()
        if (col.glow) { ctx.shadowColor=col.glow; ctx.shadowBlur=22 }
        ctx.beginPath(); ctx.ellipse(leaf.x, leaf.y, leaf.r*lp, leaf.r*lp*0.78, 0, 0, Math.PI*2)
        ctx.fillStyle = col.fill; ctx.fill(); ctx.restore()
      })
    })
    // Green atmospheric glow
    const cg = ctx.createRadialGradient(cx, trunk.y1-H*0.08, 0, cx, trunk.y1-H*0.08, W*0.28)
    cg.addColorStop(0,'rgba(20,80,20,0)'); cg.addColorStop(0.6,'rgba(15,70,15,0.12)'); cg.addColorStop(1,'transparent')
    ctx.save(); ctx.globalAlpha=canopyP*0.8; ctx.fillStyle=cg; ctx.fillRect(0,0,W,H); ctx.restore()
  }

  // ── Particles ──────────────────────────────────────────────────
  if (partP > 0) {
    particles.forEach(p => {
      const y = p.y - ((time * p.speed * 18) % (groundY * 0.85))
      if (y < 10 || y > groundY) return
      const alpha = partP * (0.3 + 0.4 * Math.sin(time * 1.2 + p.phase))
      ctx.save(); ctx.shadowColor='#00CCFF'; ctx.shadowBlur=10
      ctx.fillStyle=`rgba(80,220,255,${alpha})`; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore()
    })
  }

  // Vignette
  const vg = ctx.createRadialGradient(cx, H/2, H*0.25, cx, H/2, H*0.85)
  vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(1,4,8,0.75)')
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
}

/* ── Canvas component ── */
function TreeCanvas() {
  const canvasRef = useRef(null)
  const geoRef    = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      geoRef.current = buildTree(W, H)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let start = null
    const tick = (ts) => {
      if (!start) start = ts
      const elapsed = (ts - start) / 1000
      const progress = clamp01(elapsed / 3.8)
      const ctx = canvas.getContext('2d')
      ctx.save()
      drawTree(ctx, geoRef.current, progress, elapsed)
      ctx.restore()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }} />
}

/* ── Text column with Framer Motion reveals ── */
function HeroText() {
  const ease = { ease:[0.16,1,0.3,1], duration:0.9 }
  return (
    <motion.div
      style={styles.textCol}
      initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.12, delayChildren:0.5 } } }}
    >
      <motion.p style={styles.label} variants={{ hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:ease} }}>
        शरीरं आद्यं मन्दिरम् · चलनं प्रार्थना
      </motion.p>

      <h1 style={{ margin:0 }}>
        {['KASRAT','SHALA'].map((word, i) => (
          <span key={word} style={styles.clip}>
            <motion.span
              style={{ ...styles.word, ...(i===1 ? styles.wordAccent : {}) }}
              variants={{ hidden:{y:'115%'}, show:{y:'0%', transition:{ease:[0.16,1,0.3,1], duration:1.0, delay:i*0.12}} }}
            >{word}</motion.span>
          </span>
        ))}
      </h1>

      <motion.div style={styles.rule} variants={{ hidden:{scaleX:0}, show:{scaleX:1,transition:{ease:'easeInOut',duration:0.65}} }} />

      <motion.p style={styles.sub} variants={{ hidden:{opacity:0}, show:{opacity:1,transition:{duration:0.6}} }}>
        Movement Arts Dojo · Naggar, HP · 1,890 m
      </motion.p>

      <motion.div style={styles.pills} variants={{ hidden:{opacity:0}, show:{opacity:1} }}>
        <span style={{...styles.pill, borderColor:'rgba(212,168,83,.35)', color:'#D4A853'}}>◦ Himachal Pradesh</span>
        <span style={{...styles.pill, borderColor:'rgba(61,140,61,.35)',  color:'#3D8C3D'}}>◦ Steel Mace · Kettlebell · Rope</span>
      </motion.div>

      <motion.div style={styles.btns} variants={{ hidden:{opacity:0,y:8}, show:{opacity:1,y:0} }}>
        <button style={styles.btnPrimary}>Begin Your Sadhana</button>
        <button style={styles.btnGhost}>View Courses</button>
      </motion.div>
    </motion.div>
  )
}

/* ── Root component ── */
export default function TreeHero() {
  return (
    <div style={styles.hero}>
      <HeroText />

      {/* 3D panel — Framer animates rotateY right→front */}
      <div style={styles.treePanel}>
        <motion.div
          style={styles.treeStage}
          initial={{ rotateY:-42, x:'12%', opacity:0 }}
          animate={{ rotateY:0,   x:'0%',  opacity:1 }}
          transition={{
            rotateY: { type:'spring', stiffness:22, damping:18, delay:0.2 },
            x:       { type:'spring', stiffness:25, damping:20, delay:0.2 },
            opacity: { duration:0.6, delay:0.1 },
          }}
        >
          <motion.div
            style={{ width:'100%', height:'100%' }}
            animate={{ y:[0,-14,0] }}
            transition={{ duration:5.5, ease:'easeInOut', repeat:Infinity, delay:4.2 }}
          >
            <TreeCanvas />
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div style={styles.scrollHint} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:4.2,duration:0.8}}>
        <span style={styles.scrollLabel}>Scroll</span>
        <div style={styles.scrollBar} />
      </motion.div>
    </div>
  )
}

/* ── Inline styles (swap for Tailwind / CSS modules as needed) ── */
const styles = {
  hero: {
    position:'relative', width:'100vw', height:'100vh',
    display:'flex', alignItems:'center', overflow:'hidden',
    background:'#020810', color:'#F0E6DC', fontFamily:'Georgia, serif',
  },
  textCol: {
    position:'relative', zIndex:20,
    padding:'0 6vw', maxWidth:'46%',
    display:'flex', flexDirection:'column',
  },
  label: {
    fontSize:'clamp(.75rem,1vw,.9rem)', color:'#D4A853',
    letterSpacing:'.18em', marginBottom:'2.2rem',
  },
  clip: {
    display:'block', overflow:'hidden', lineHeight:0.9, marginBottom:'.06em',
  },
  word: {
    display:'block',
    fontSize:'clamp(3.6rem,9vw,8.5rem)', fontWeight:700, letterSpacing:'-.025em',
    color:'#F0E6DC',
  },
  wordAccent: { color:'#A83030' },
  rule: {
    height:1, transformOrigin:'left',
    background:'linear-gradient(90deg,#A83030,#D4A853 60%,transparent)',
    margin:'1.8rem 0 1.6rem',
  },
  sub: {
    fontSize:'clamp(.78rem,1.2vw,.95rem)', color:'#9A8878',
    letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'2.2rem',
  },
  pills: { display:'flex', gap:'.65rem', flexWrap:'wrap', marginBottom:'2.6rem' },
  pill: {
    padding:'.3rem .85rem', borderRadius:100, fontSize:'.67rem',
    letterSpacing:'.12em', textTransform:'uppercase', border:'1px solid',
    fontFamily:'system-ui, sans-serif',
  },
  btns: { display:'flex', gap:'.9rem' },
  btnPrimary: {
    padding:'.76rem 1.9rem', borderRadius:3, fontSize:'.78rem',
    letterSpacing:'.12em', textTransform:'uppercase', cursor:'pointer', border:'none',
    fontFamily:'system-ui, sans-serif', background:'#A83030', color:'#F0E6DC',
    boxShadow:'0 4px 24px rgba(107,26,26,.5)',
  },
  btnGhost: {
    padding:'.76rem 1.9rem', borderRadius:3, fontSize:'.78rem',
    letterSpacing:'.12em', textTransform:'uppercase', cursor:'pointer',
    fontFamily:'system-ui, sans-serif', background:'transparent', color:'#9A8878',
    border:'1px solid rgba(240,230,220,.14)',
  },
  treePanel: {
    position:'absolute', right:0, top:0, bottom:0, width:'58%',
    perspective:'1100px', perspectiveOrigin:'50% 50%',
  },
  treeStage: {
    width:'100%', height:'100%',
    display:'flex', alignItems:'center', justifyContent:'center',
    transformStyle:'preserve-3d',
  },
  scrollHint: {
    position:'absolute', bottom:'2.2rem', left:'50%',
    transform:'translateX(-50%)',
    display:'flex', flexDirection:'column', alignItems:'center', gap:'.45rem',
  },
  scrollLabel: {
    fontSize:'.58rem', letterSpacing:'.22em', textTransform:'uppercase',
    color:'#9A8878', fontFamily:'system-ui, sans-serif',
  },
  scrollBar: {
    width:1, height:42,
    background:'linear-gradient(180deg,#D4A853,transparent)',
    animation:'sb 2.5s ease-in-out infinite',
  },
}
