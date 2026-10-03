// Tiny synthesized sound effects (no audio assets to ship).
let ctx: AudioContext | null = null
let muted = false
try {
  muted = localStorage.getItem("ttt-muted") === "1"
} catch {}

export const isMuted = () => muted
export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem("ttt-muted", value ? "1" : "0")
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "triangle", gain = 0.15) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  amp.gain.setValueAtTime(gain, ctx.currentTime + start)
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  osc.connect(amp).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + dur)
}

export type Sfx = "place" | "win" | "lose" | "draw" | "pop"

export function play(sfx: Sfx) {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === "suspended") void ctx.resume()
    if (sfx === "place") tone(520, 0, 0.12)
    else if (sfx === "pop") tone(880, 0, 0.1, "sine", 0.1)
    else if (sfx === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25))
    else if (sfx === "lose") [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.08))
    else {
      tone(392, 0, 0.2, "sine")
      tone(392, 0.2, 0.2, "sine")
    }
  } catch {}
}
