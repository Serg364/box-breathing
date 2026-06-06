import type { PhaseState, PhaseType, SchedulerStatus, SoundStyle } from '../breathing/types.ts';

const MASTER_VOLUME = 0.14;

interface ActiveNodes {
  sources: AudioScheduledSourceNode[];
  gains: GainNode[];
  filters: BiquadFilterNode[];
}

export class BreathingAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private pinkNoise: AudioBuffer | null = null;
  private brownNoise: AudioBuffer | null = null;
  private active: ActiveNodes = { sources: [], gains: [], filters: [] };
  private lastScheduleIndex = -1;
  private lastCountdown = -1;
  private enabled = true;
  private style: SoundStyle = 'soft';

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.stopAll();
      this.lastScheduleIndex = -1;
    }
  }

  setStyle(style: SoundStyle): void {
    this.style = style;
  }

  initOnUserGesture(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = MASTER_VOLUME;
      this.masterGain.connect(this.ctx.destination);
      this.pinkNoise = createPinkNoiseBuffer(this.ctx);
      this.brownNoise = createBrownNoiseBuffer(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  onStatusChange(status: SchedulerStatus): void {
    if (status === 'paused') {
      void this.ctx?.suspend();
      return;
    }

    if (status === 'running') {
      void this.ctx?.resume();
      return;
    }

    if (status === 'idle' || status === 'finished') {
      this.stopAll();
      this.lastScheduleIndex = -1;
      this.lastCountdown = -1;
    }
  }

  onCountdown(secondsLeft: number): void {
    if (!this.enabled || !this.ctx || secondsLeft === this.lastCountdown) {
      return;
    }

    this.lastCountdown = secondsLeft;
    this.playSoftTick();
  }

  onTick(state: PhaseState): void {
    if (!this.enabled || !this.ctx) {
      return;
    }

    if (state.scheduleIndex !== this.lastScheduleIndex) {
      this.lastScheduleIndex = state.scheduleIndex;
      this.playPhase(state.phase, state.phaseDuration);
    }
  }

  private stopAll(): void {
    for (const source of this.active.sources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }

    for (const node of [...this.active.gains, ...this.active.filters]) {
      node.disconnect();
    }

    this.active = { sources: [], gains: [], filters: [] };
  }

  private playPhase(phase: PhaseType, durationSec: number): void {
    this.stopAll();

    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) {
      return;
    }

    const duration = Math.max(0.2, durationSec);

    switch (this.style) {
      case 'bowl':
        this.playBowlPhase(ctx, master, phase, duration);
        break;
      case 'wind':
        this.playWindPhase(ctx, master, phase, duration);
        break;
      default:
        this.playSoftPhase(ctx, master, phase, duration);
        break;
    }
  }

  private playSoftPhase(
    ctx: AudioContext,
    master: GainNode,
    phase: PhaseType,
    duration: number,
  ): void {
    const now = ctx.currentTime;
    const fadeIn = Math.min(0.8, duration * 0.25);
    const fadeOut = Math.min(1, duration * 0.3);
    const buffer = phase === 'hold_in' || phase === 'hold_out' ? this.brownNoise : this.pinkNoise;
    if (!buffer) {
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.4;

    const gain = ctx.createGain();
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    if (phase === 'inhale') {
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(720, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + fadeIn);
      gain.gain.setValueAtTime(0.22, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else if (phase === 'exhale') {
      filter.frequency.setValueAtTime(720, now);
      filter.frequency.exponentialRampToValueAtTime(240, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + fadeIn);
      gain.gain.setValueAtTime(0.2, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else {
      filter.frequency.setValueAtTime(320, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.5);
      gain.gain.setValueAtTime(0.06, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    }

    source.start(now);
    source.stop(now + duration + 0.05);
    this.track(source, gain, filter);
  }

  private playBowlPhase(
    ctx: AudioContext,
    master: GainNode,
    phase: PhaseType,
    duration: number,
  ): void {
    const now = ctx.currentTime;

    if (phase === 'hold_in' || phase === 'hold_out') {
      this.playBowlStrike(ctx, master, now, 392, 0.14);
      return;
    }

    const freqs =
      phase === 'inhale'
        ? [261.6, 329.6, 392]
        : [392, 329.6, 261.6];
    const fadeIn = Math.min(1.2, duration * 0.3);
    const fadeOut = Math.min(1.2, duration * 0.35);

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.3;

      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + fadeIn);
      gain.gain.setValueAtTime(0.08, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.start(now);
      osc.stop(now + duration + 0.05);
      this.track(osc, gain, filter);
    }
  }

  private playWindPhase(
    ctx: AudioContext,
    master: GainNode,
    phase: PhaseType,
    duration: number,
  ): void {
    const now = ctx.currentTime;
    const buffer = this.brownNoise;
    if (!buffer) {
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    const fadeIn = Math.min(1, duration * 0.28);
    const fadeOut = Math.min(1.2, duration * 0.32);

    if (phase === 'inhale') {
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + fadeIn);
      gain.gain.setValueAtTime(0.18, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else if (phase === 'exhale') {
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + fadeIn);
      gain.gain.setValueAtTime(0.16, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else {
      filter.frequency.setValueAtTime(260, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.6);
      gain.gain.setValueAtTime(0.04, now + duration - fadeOut);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    }

    source.start(now);
    source.stop(now + duration + 0.05);
    this.track(source, gain, filter);
  }

  private playBowlStrike(
    ctx: AudioContext,
    master: GainNode,
    now: number,
    frequency: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.92, now + 1.8);

    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.start(now);
    osc.stop(now + 1.7);
    this.track(osc, gain);
  }

  private playSoftTick(): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(392, now);

    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.2);
    this.track(osc, gain);
  }

  private track(
    source: AudioScheduledSourceNode,
    gain: GainNode,
    filter?: BiquadFilterNode,
  ): void {
    this.active.sources.push(source);
    this.active.gains.push(gain);
    if (filter) {
      this.active.filters.push(filter);
    }
  }
}

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

function createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + white * 0.02) / 1.02;
    data[i] = last * 3.5;
  }

  return buffer;
}
