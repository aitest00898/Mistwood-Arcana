import type { AttackId } from './types';

type ExtendedWindow = Window & { webkitAudioContext?: typeof AudioContext };
type AudioMode = 'menu' | 'gameplay' | 'combat';

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicStarted = false;
  private muted = false;
  private mode: AudioMode = 'menu';
  private combatIntensity = 0;
  private readonly activeVoices = new Map<string, number>();
  private readonly lastEvent = new Map<string, number>();

  get isMuted(): boolean { return this.muted; }

  private ensure(): AudioContext | null {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
      if (!AudioContextCtor) return null;
      this.context = new AudioContextCtor();
      const finalLimiter = this.context.createDynamicsCompressor();
      finalLimiter.threshold.value = -3.5;
      finalLimiter.knee.value = 2;
      finalLimiter.ratio.value = 20;
      finalLimiter.attack.value = 0.001;
      finalLimiter.release.value = 0.16;
      finalLimiter.connect(this.context.destination);
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.48;
      this.masterGain.connect(finalLimiter);

      const sfxCompressor = this.context.createDynamicsCompressor();
      sfxCompressor.threshold.value = -30;
      sfxCompressor.knee.value = 22;
      sfxCompressor.ratio.value = 8;
      sfxCompressor.attack.value = 0.003;
      sfxCompressor.release.value = 0.13;
      sfxCompressor.connect(this.masterGain);
      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = 0.42;
      this.sfxGain.connect(sfxCompressor);

      const musicCompressor = this.context.createDynamicsCompressor();
      musicCompressor.threshold.value = -24;
      musicCompressor.knee.value = 18;
      musicCompressor.ratio.value = 4;
      musicCompressor.attack.value = 0.01;
      musicCompressor.release.value = 0.24;
      musicCompressor.connect(this.masterGain);
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.14;
      this.musicGain.connect(musicCompressor);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  startMusic(): void {
    if (this.muted || this.musicStarted) return;
    const context = this.ensure();
    if (!context || !this.musicGain) return;
    this.musicStarted = true;
    this.musicStep = 0;
    this.scheduleMusicStep();
    this.musicTimer = window.setInterval(() => this.scheduleMusicStep(), 360);
  }

  setMode(mode: AudioMode): void {
    this.mode = mode;
    if (mode === 'menu') this.setCombatIntensity(0);
  }

  setCombatIntensity(value: number): void {
    this.combatIntensity = Math.max(0, Math.min(1, value));
    if (this.musicGain && this.context) {
      const target = this.mode === 'menu' ? 0.12 : 0.13 + this.combatIntensity * 0.025;
      this.musicGain.gain.setTargetAtTime(target, this.context.currentTime, 0.45);
    }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.masterGain && this.context) this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.035);
      if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    } else {
      const context = this.ensure();
      if (this.masterGain && context) this.masterGain.gain.setTargetAtTime(0.48, context.currentTime, 0.08);
      this.musicStarted = false;
      this.startMusic();
    }
    return this.muted;
  }

  private allowVoice(kind: string, maxVoices: number, cooldown: number): boolean {
    const now = performance.now() / 1000;
    const active = this.activeVoices.get(kind) ?? 0;
    if (active >= maxVoices) return false;
    if (now - (this.lastEvent.get(kind) ?? -Infinity) < cooldown) return false;
    this.lastEvent.set(kind, now);
    this.activeVoices.set(kind, active + 1);
    return true;
  }

  private releaseVoice(kind: string, duration: number): void {
    window.setTimeout(() => {
      const active = this.activeVoices.get(kind) ?? 0;
      this.activeVoices.set(kind, Math.max(0, active - 1));
    }, Math.max(80, duration * 1000 + 80));
  }

  private tone(kind: string, frequency: number, duration: number, gain: number, type: OscillatorType, slide = 0, maxVoices = 4, cooldown = 0.018): void {
    const context = this.ensure();
    if (!context || !this.sfxGain || !this.allowVoice(kind, maxVoices, cooldown)) return;
    const start = context.currentTime + 0.006;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
    oscillator.frequency.linearRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(Math.max(0.0001, gain), start + Math.min(0.018, duration * 0.18));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.035, duration - 0.012));
    oscillator.connect(envelope);
    envelope.connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.035);
    this.releaseVoice(kind, duration);
  }

  private noiseBurst(kind: string, duration: number, gain: number, highpass = 900, maxVoices = 3, cooldown = 0.025): void {
    const context = this.ensure();
    if (!context || !this.sfxGain || !this.allowVoice(kind, maxVoices, cooldown)) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const fade = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    source.buffer = buffer;
    const start = context.currentTime + 0.006;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.012, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.03, duration - 0.012));
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.sfxGain);
    source.start(start);
    source.stop(start + duration + 0.02);
    this.releaseVoice(kind, duration);
  }

  lightning(intensity = 1): void {
    const strength = Math.max(0.45, Math.min(1.45, intensity));
    this.tone('lightning', 174, 0.13, 0.014 * strength, 'triangle', 270, 4, 0.055);
    this.tone('lightning-crystal', 560, 0.075, 0.006 * strength, 'sine', -150, 3, 0.055);
    this.noiseBurst('lightning-noise', 0.05, 0.0045 * strength, 1700, 3, 0.055);
  }

  attack(id: AttackId, intensity = 1): void {
    if (id === 'lightning') { this.lightning(intensity); return; }
    const strength = Math.max(0.35, Math.min(1.25, intensity));
    const map: Record<Exclude<AttackId, 'lightning'>, [number, OscillatorType, number, number]> = {
      eclipseArc: [145, 'sawtooth', -90, 0.06], astralLance: [760, 'sine', 340, 0.05], sanctumThorns: [420, 'sine', 180, 0.12], gravityWell: [72, 'sine', -24, 0.12],
      starfeatherFamiliar: [980, 'triangle', 120, 0.07], crownOfBlades: [280, 'triangle', 110, 0.09], thornJavelin: [112, 'triangle', 54, 0.1], ricochetStar: [680, 'sine', 220, 0.055],
      prismRefraction: [530, 'sine', 420, 0.1], galeReaper: [190, 'sawtooth', 80, 0.09], celestialFall: [250, 'sine', -80, 0.11], echoShade: [230, 'triangle', -90, 0.1],
      mirrorTwin: [420, 'sine', 240, 0.11], mistwoodRuneMine: [102, 'triangle', -34, 0.11], moonreturnChakram: [360, 'sine', 190, 0.09],
    };
    const [frequency, type, slide, cooldown] = map[id];
    this.tone(`attack-${id}`, frequency, id === 'gravityWell' ? 0.28 : 0.12, 0.012 * strength, type, slide, 2, cooldown);
    if (id === 'astralLance' || id === 'prismRefraction' || id === 'moonreturnChakram') this.tone(`attack-${id}-harmonic`, frequency * 1.5, 0.09, 0.005 * strength, 'sine', 80, 2, cooldown);
    if (id === 'thornJavelin' || id === 'mistwoodRuneMine' || id === 'gravityWell') this.noiseBurst(`attack-${id}-texture`, 0.09, 0.004 * strength, 420, 2, cooldown);
  }

  hit(critical = false): void {
    this.tone('hit', critical ? 620 : 360, critical ? 0.09 : 0.06, critical ? 0.013 : 0.006, 'triangle', critical ? 220 : -70, 5, 0.025);
  }

  death(): void {
    this.tone('death', 170, 0.2, 0.022, 'triangle', -110, 4, 0.04);
    this.noiseBurst('death-noise', 0.14, 0.012, 500, 3, 0.04);
  }

  pickup(): void { this.tone('pickup', 620, 0.08, 0.012, 'sine', 240, 5, 0.035); }

  levelUp(): void {
    this.tone('level-up', 440, 0.14, 0.022, 'sine', 160, 2, 0.15);
    window.setTimeout(() => this.tone('level-up', 660, 0.18, 0.019, 'sine', 180, 2, 0.15), 100);
  }

  select(): void {
    this.tone('select', 520, 0.08, 0.017, 'triangle', 180, 2, 0.08);
    window.setTimeout(() => this.tone('select', 780, 0.12, 0.013, 'sine', -50, 2, 0.08), 60);
  }

  heroSelect(index: number): void {
    const notes = [660, 540, 420];
    this.tone('hero-select', notes[index] ?? 660, 0.16, 0.014, index === 2 ? 'triangle' : 'sine', index === 1 ? 160 : 90, 2, 0.12);
  }

  hurt(): void { this.tone('hurt', 110, 0.13, 0.012, 'triangle', -25, 2, 0.12); }

  private musicNote(frequency: number, start: number, duration: number, gain: number, type: OscillatorType): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.1, duration * 0.16));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.05, duration - 0.04));
    oscillator.connect(envelope);
    envelope.connect(this.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  private musicNoise(start: number, duration: number, gain: number): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 1300;
    source.buffer = buffer;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.musicGain);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  private scheduleMusicStep(): void {
    const context = this.ensure();
    if (!context || this.muted || !this.musicGain) return;
    const step = this.musicStep % 192;
    const bar = Math.floor(step / 8);
    const phase = Math.floor(bar / 6) % 6;
    const roots = [146.83, 164.81, 130.81, 116.54, 146.83, 174.61, 130.81, 123.47];
    const root = roots[bar % roots.length];
    const start = context.currentTime + 0.025;
    const minor = [1, 1.122, 1.189, 1.335, 1.498, 1.682, 1.888];
    const motif = [0, 2, 4, 3, 1, 4, 2, 5];
    const note = root * minor[(motif[step % 8] + phase) % minor.length];
    // 192 scheduled steps at 360ms create a varied ~69-second score before
    // the harmonic movement returns to its opening phase.
    this.musicNote(root / 2, start, 0.62, 0.042, 'sine');
    this.musicNote(root / 2 * 1.005, start, 0.58, 0.026, 'triangle');
    this.musicNote(note, start, 0.24, phase === 4 ? 0.022 : 0.015, 'triangle');
    if (step % 2 === 1) this.musicNote(note * 2, start + 0.04, 0.15, 0.008, 'sine');
    if (step % 8 === 0) {
      const chord = phase === 3 || phase === 4 ? [1, 1.189, 1.498] : [1, 1.189, 1.414];
      chord.forEach((ratio, index) => this.musicNote(root * ratio, start, 1.35, 0.009 - index * 0.0015, 'sine'));
      this.musicNote(root * 3, start, 0.5, phase === 4 ? 0.022 : 0.012, 'triangle');
    }
    if (step % 4 === 2 && phase >= 2) this.musicNoise(start, 0.07, 0.006 + this.combatIntensity * 0.006);
    if (step % 16 === 0 && phase !== 0) this.musicNote(root * 2.5, start, 0.42, 0.014, 'sine');
    this.musicStep += 1;
  }
}
