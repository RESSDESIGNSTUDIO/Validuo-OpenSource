"use client";

import { useEffect, useRef } from "react";

// The dune field from the sign-in panel and the Custom workspace page, held
// still: dotted horizontal lines on layered value noise, pushed around by a few
// invisible points, fading out before they reach the copy. The Sandboxes mark
// surfaces in the same grains beside the copy, bottom right, where there is
// room for it. Delete this file and its <Backdrop /> once your app has its own
// background.

const MARK_PATH =
  "M382.985 5.30048C392.343 0.196502 403.66 0.241892 413.101 5.3856L559.238 85.4022L561.435 86.844C569.651 93.1354 568.897 106.496 559.453 111.657L559.442 111.663L414.994 190.785C399.4 199.346 389.747 215.776 389.74 233.579V403.887C389.74 403.937 389.744 403.986 389.745 404.036C389.745 404.096 389.738 404.157 389.74 404.217C389.997 417.104 395.559 428.909 405.201 435.437C415.064 442.115 427.735 442.267 439.635 434.665C439.778 434.597 439.925 434.535 440.066 434.458L593.232 350.61C597.39 348.368 602.418 348.236 606.719 350.232L607.572 350.663L786.526 448.602L786.537 448.607C791.383 451.254 794.5 456.443 794.5 462.208V672.857C794.5 673.38 794.467 673.756 794.434 674.018C794.054 674.214 793.448 674.503 792.341 674.977C790.876 675.604 788.817 676.47 786.537 677.718L786.526 677.723C659.332 747.351 531.36 818.455 404.244 888.082L404.211 888.099C400.4 890.207 395.791 890.235 391.837 888.077L391.794 888.05L391.746 888.028L19.1771 690.888L19.0372 690.812L17.0797 689.738C7.5246 684.022 1.5011 673.489 1.5 661.905V472.213C1.5 460.23 7.99103 449.304 18.2413 443.675L178.647 355.979L178.663 355.974C194.256 347.413 203.944 330.967 203.945 313.148V121.714C203.945 109.674 210.474 98.7495 220.799 93.1071L220.804 93.1125L382.958 5.31111L382.985 5.30048ZM410.24 448.128C401.675 445.732 392.969 446.629 386.588 447.979C380.102 449.352 375.232 451.369 373.961 451.922L373.557 452.098L373.176 452.316C373.027 452.401 372.895 452.478 372.789 452.545C372.75 452.57 372.71 452.592 372.676 452.614L212.679 540.239C197.082 548.805 187.426 565.228 187.424 583.041C187.424 639.193 187.079 759.627 187.074 761.164V761.208C187.087 767.403 189.302 778.563 202.041 784.873L202.084 784.894C213.141 790.294 224.268 784.894 229.544 781.658L229.549 781.663C230.467 781.151 343.288 718.438 391.848 691.836L391.88 691.82C395.69 689.711 400.301 689.684 404.254 691.836L561.754 778.132C561.892 778.208 562.035 778.263 562.173 778.328C568.98 782.175 575.66 783.805 582.02 783.096C588.546 782.366 593.799 779.277 597.731 775.37C605.237 767.894 608.674 756.761 608.674 748.762V572.977C608.674 561.414 602.445 550.663 592.202 545.062L440.006 461.714C439.424 461.394 438.85 461.026 438.281 460.612L437.947 460.367L437.592 460.16L435.505 458.968C430.027 455.892 420.411 450.977 410.24 448.128ZM372.359 452.838C372.327 452.86 372.294 452.881 372.289 452.886C372.293 452.882 372.301 452.876 372.31 452.87C372.323 452.861 372.343 452.845 372.369 452.827L372.359 452.838Z"
const MARK_W = 796
const MARK_H = 891.188
const MARK_ALPHA = 1.6
const MARK_SIZE_GAIN = 0.5

const SPACING_X = 6
const SPACING_Y = 11
const GRAIN_SIZE = 1.7
const CROWD_PEAK = 1.7
const OVERSCAN = 8
const LIFT = 84
const NOISE_SCALE = 2.1
const OCTAVES = 4
const FIELD_COLS = 64
const FIELD_ROWS = 44
const PUSHERS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0.34, 1],
  [2.4, 0.26, -0.8],
  [4.1, 0.42, 0.65],
]
const PUSHER_DRIFT = 0.13
const GRAIN = "#f8fec6"
const STILL_FRAME = 9.1

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n)
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function hash3(x: number, y: number, z: number) {
  let n = (x * 374761393 + y * 668265263 + z * 1274126177) | 0
  n = (n ^ (n >>> 13)) | 0
  n = Math.imul(n, 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = fade(x - xi)
  const yf = fade(y - yi)
  const zf = fade(z - zi)
  const x00 = mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), xf)
  const x10 = mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), xf)
  const x01 = mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), xf)
  const x11 = mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), xf)
  return mix(mix(x00, x10, yf), mix(x01, x11, yf), zf) * 2 - 1
}

function fbm(x: number, y: number, z: number) {
  let sum = 0
  let amp = 1
  let norm = 0
  for (let o = 0; o < OCTAVES; o++) {
    sum += noise3(x, y, z) * amp
    norm += amp
    amp *= 0.5
    x *= 2.03
    y *= 1.97
    z *= 1.91
  }
  return sum / norm
}

// Beside the copy, bottom right, bleeding off the page. Left out where the copy
// runs close to the edge, as it does in a narrow pane.
function markRect(width: number, height: number) {
  const copy = document.querySelector(".starter main")?.getBoundingClientRect()
  if (!copy) return null
  const left = copy.right + 40
  const room = width - left
  if (room < 220) return null
  const h = Math.min((room * 1.25 * MARK_H) / MARK_W, height * 0.6)
  return { x: left, y: height - h * 0.8, h }
}

export default function Backdrop() {
  const duneRef = useRef<HTMLCanvasElement>(null)
  const markRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = duneRef.current
    const markCanvas = markRef.current
    const ctx = canvas?.getContext("2d")
    const markCtx = markCanvas?.getContext("2d")
    if (!canvas || !markCanvas || !ctx || !markCtx) return

    let w = 0
    let h = 0
    let dpr = 1
    let mask = new Uint8Array(0)
    let maskW = 0
    const field = new Float32Array(FIELD_COLS * FIELD_ROWS)

    const renderMask = () => {
      const place = markRect(w, h)
      if (!place) {
        mask = new Uint8Array(0)
        return
      }
      maskW = Math.max(1, Math.round(w))
      const maskH = Math.max(1, Math.round(h))
      const off = document.createElement("canvas")
      off.width = maskW
      off.height = maskH
      const offCtx = off.getContext("2d", { willReadFrequently: true })
      if (!offCtx) return
      offCtx.translate(place.x, place.y)
      offCtx.scale(place.h / MARK_H, place.h / MARK_H)
      offCtx.fillStyle = "#fff"
      offCtx.fill(new Path2D(MARK_PATH), "nonzero")
      const data = offCtx.getImageData(0, 0, maskW, maskH).data
      mask = new Uint8Array(maskW * maskH)
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3]
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      markCanvas.width = canvas.width
      markCanvas.height = canvas.height
      renderMask()
    }

    const buildField = (t: number) => {
      const pushers = PUSHERS.map(([phase, radius, strength]) => ({
        x: noise3(phase, 11.3, t * PUSHER_DRIFT) * 0.9,
        y: noise3(phase + 7.7, 3.1, t * PUSHER_DRIFT) * 0.9,
        r: radius,
        s: strength,
      }))
      for (let j = 0; j < FIELD_ROWS; j++) {
        const v = (j / (FIELD_ROWS - 1)) * 2 - 1
        for (let i = 0; i < FIELD_COLS; i++) {
          const u = (i / (FIELD_COLS - 1)) * 2 - 1
          let n = fbm(u * NOISE_SCALE, v * NOISE_SCALE, t)
          for (const p of pushers) {
            const dx = u - p.x
            const dy = v - p.y
            const d2 = (dx * dx + dy * dy) / (p.r * p.r)
            if (d2 < 6) n += p.s * Math.exp(-d2)
          }
          field[j * FIELD_COLS + i] = n
        }
      }
    }

    const sampleField = (u: number, v: number) => {
      const fx = clamp((u + 1) / 2, 0, 1) * (FIELD_COLS - 1)
      const fy = clamp((v + 1) / 2, 0, 1) * (FIELD_ROWS - 1)
      const x0 = fx | 0
      const y0 = fy | 0
      const x1 = Math.min(x0 + 1, FIELD_COLS - 1)
      const y1 = Math.min(y0 + 1, FIELD_ROWS - 1)
      const tx = fx - x0
      const ty = fy - y0
      return mix(
        mix(field[y0 * FIELD_COLS + x0], field[y0 * FIELD_COLS + x1], tx),
        mix(field[y1 * FIELD_COLS + x0], field[y1 * FIELD_COLS + x1], tx),
        ty,
      )
    }

    const draw = (t: number) => {
      buildField(t)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = GRAIN
      markCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      markCtx.clearRect(0, 0, w, h)
      markCtx.fillStyle = GRAIN
      const cols = Math.ceil(w / SPACING_X) + OVERSCAN * 2
      const rows = Math.ceil(h / SPACING_Y) + OVERSCAN * 2
      let prev = new Float32Array(cols)
      let curr = new Float32Array(cols)
      let hasPrev = false

      for (let row = 0; row < rows; row++) {
        const y0 = (row - OVERSCAN) * SPACING_Y
        const v = (y0 / Math.max(1, h)) * 2 - 1
        for (let col = 0; col < cols; col++) {
          const x = (col - OVERSCAN) * SPACING_X
          const u = (x / Math.max(1, w)) * 2 - 1
          const y = y0 - sampleField(u, v) * LIFT
          curr[col] = y
          if (x < 0 || x >= w || y < 0 || y >= h) continue

          const gap = hasPrev ? Math.abs(y - prev[col]) : SPACING_Y
          const crowd = clamp(SPACING_Y / Math.max(gap, 0.6), 0.25, 4)
          const shape =
            crowd <= CROWD_PEAK ? crowd / CROWD_PEAK : Math.max(0.4, 1 - (crowd - CROWD_PEAK) * 0.42)
          const base = clamp(0.06 + 0.7 * shape, 0.03, 0.8)
          ctx.globalAlpha = base
          ctx.fillRect(x, y, GRAIN_SIZE, GRAIN_SIZE)

          const inMark = mask.length ? mask[(y | 0) * maskW + (x | 0)] / 255 : 0
          if (inMark > 0) {
            markCtx.globalAlpha = clamp(base * MARK_ALPHA * inMark, 0, 1)
            const size = GRAIN_SIZE + MARK_SIZE_GAIN * inMark
            markCtx.fillRect(x, y, size, size)
          }
        }
        const swap = prev
        prev = curr
        curr = swap
        hasPrev = true
      }
      ctx.globalAlpha = 1
      markCtx.globalAlpha = 1
    }

    resize()
    draw(STILL_FRAME)
    const observer = new ResizeObserver(() => {
      resize()
      draw(STILL_FRAME)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="backdrop" aria-hidden="true">
      <canvas ref={duneRef} className="dune" />
      <div className="vignette" />
      <canvas ref={markRef} className="mark-field" />
    </div>
  )
}
