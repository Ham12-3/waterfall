import { CONFIG } from '../config'

const A = CONFIG.audio

/**
 * All game audio, synthesised with the Web Audio API from filtered noise, so
 * no sound files are needed: a looping waterfall roar whose volume and
 * brightness follow the player's distance from the falls, plus one-shot
 * splashes and footfalls.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private roarGain!: GainNode
  private roarFilter!: BiquadFilterNode
  private noise!: AudioBuffer

  /** Must be called from a user gesture (browsers block audio before one). */
  start() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.noise = this.makeNoise(ctx, 3)

    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    // Roar: looping noise, a low rumble band plus a brighter hiss band.
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    this.roarFilter = ctx.createBiquadFilter()
    this.roarFilter.type = 'lowpass'
    this.roarFilter.frequency.value = A.roarFarCutoff
    const rumble = ctx.createBiquadFilter()
    rumble.type = 'lowshelf'
    rumble.frequency.value = 180
    rumble.gain.value = 9
    this.roarGain = ctx.createGain()
    this.roarGain.gain.value = A.roarFarGain
    source.connect(this.roarFilter).connect(rumble).connect(this.roarGain).connect(this.master)
    source.start()
  }

  private makeNoise(ctx: AudioContext, seconds: number) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    // Pink-ish noise (Paul Kellet's economy filter): closer to rushing water than white noise.
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18
    }
    return buffer
  }

  /** Overall volume, 0..1. Eases to the new level to avoid clicks. */
  setMaster(level: number) {
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(level, this.ctx.currentTime, 0.12)
  }

  /** `closeness` is 0 far from the falls and 1 right underneath them. */
  setRoar(closeness: number) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.roarGain.gain.setTargetAtTime(A.roarFarGain + (A.roarNearGain - A.roarFarGain) * closeness, now, 0.2)
    this.roarFilter.frequency.setTargetAtTime(
      A.roarFarCutoff + (A.roarNearCutoff - A.roarFarCutoff) * closeness,
      now,
      0.2,
    )
  }

  /** A short burst of band-passed noise. */
  private burst(volume: number, frequency: number, duration: number, sweepTo: number) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 0.8
    filter.frequency.setValueAtTime(frequency, now)
    filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(filter).connect(gain).connect(this.master)
    source.start(now, Math.random() * 2, duration + 0.05)
  }

  /** Falling into the pool. */
  splash() {
    this.burst(A.splashGain, 1400, 0.9, 350)
    this.burst(A.splashGain * 0.7, 300, 0.5, 90)
  }

  /** Landing on rock. `strength` 0..1; wet stone gets a brighter slap. */
  land(strength: number, wet: boolean) {
    this.burst(A.landGain * (0.3 + 0.7 * strength), wet ? 2200 : 500, wet ? 0.22 : 0.14, wet ? 900 : 160)
  }
}

export const audioEngine = new AudioEngine()
