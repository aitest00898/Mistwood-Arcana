type ExtendedWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicStarted = false;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
      if (!AudioContextCtor) return null;
      this.context = new AudioContextCtor();
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.18;
      compressor.connect(this.context.destination);
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(compressor);
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.27;
      this.musicGain.connect(this.masterGain);
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
    this.musicTimer = window.setInterval(() => this.scheduleMusicStep(), 620);
  }

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.masterGain && this.context) this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
      if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    } else {
      const context = this.ensure();
      if (this.masterGain && context) this.masterGain.gain.setTargetAtTime(0.72, context.currentTime, 0.04);
      this.musicStarted = false;
      this.startMusic();
    }
    return this.muted;
  }

  private connectEnvelope(envelope: GainNode, destination: AudioNode): void {
    envelope.connect(destination);
  }

  private tone(frequency: number, duration: number, gain: number, type: OscillatorType, slide = 0): void {
    const context = this.ensure();
    if (!context || !this.masterGain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), context.currentTime + duration);
    envelope.gain.setValueAtTime(0.0001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    this.connectEnvelope(envelope, this.masterGain);
    oscillator.connect(envelope);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  private musicNote(frequency: number, start: number, duration: number, gain: number, type: OscillatorType): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.08, duration * 0.18));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private scheduleMusicStep(): void {
    const context = this.ensure();
    if (!context || this.muted || !this.musicGain) return;
    const step = this.musicStep % 16;
    const bar = Math.floor(step / 4);
    const roots = [146.83, 174.61, 130.81, 116.54];
    const root = roots[bar];
    const start = context.currentTime + 0.03;
    const pattern = [1, 1.5, 1.25, 2, 1.5, 1.25, 1, 1.5];
    const note = root * pattern[step % pattern.length];
    this.musicNote(root / 2, start, 0.55, 0.085, 'sine');
    this.musicNote(note, start, 0.32, 0.045, 'triangle');
    this.musicNote(note * 2, start + 0.17, 0.22, 0.018, 'sine');
    if (step % 4 === 0) {
      this.musicNote(root * 1.5, start, 2.28, 0.018, 'sine');
      this.musicNote(root * 1.25, start, 2.28, 0.014, 'triangle');
    }
    this.musicStep += 1;
  }

  private noiseBurst(duration: number, gain: number, highpass = 900): void {
    const context = this.ensure();
    if (!context || !this.masterGain) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    source.buffer = buffer;
    envelope.gain.setValueAtTime(0.0001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    source.start();
    source.stop(context.currentTime + duration + 0.01);
  }

  lightning(): void {
    this.tone(240, 0.14, 0.035, 'sawtooth', 480);
    this.tone(710, 0.07, 0.018, 'triangle', -240);
    this.noiseBurst(0.08, 0.018, 1400);
  }

  hit(critical = false): void {
    this.tone(critical ? 660 : 410, critical ? 0.1 : 0.07, critical ? 0.035 : 0.022, 'square', critical ? 260 : -90);
  }

  death(): void {
    this.tone(170, 0.2, 0.035, 'triangle', -110);
    this.noiseBurst(0.16, 0.022, 500);
  }

  pickup(): void {
    this.tone(620, 0.08, 0.018, 'sine', 240);
  }

  levelUp(): void {
    this.tone(440, 0.14, 0.03, 'sine', 160);
    window.setTimeout(() => this.tone(660, 0.18, 0.028, 'sine', 180), 90);
  }

  select(): void {
    this.tone(520, 0.08, 0.025, 'triangle', 180);
    window.setTimeout(() => this.tone(780, 0.12, 0.02, 'sine', -50), 55);
  }

  hurt(): void {
    this.tone(110, 0.13, 0.04, 'sawtooth', -25);
  }
}
