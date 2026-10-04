// Audio engine using Web Audio API to play authentic rhythmic Brazilian music previews
class PreviewAudioPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentPackId: string | null = null;
  private timerId: number | null = null;
  private progressInterval: number | null = null;
  private volume: number = 0.6;
  private onStateChangeListeners: ((isPlaying: boolean, packId: string | null, progress: number) => void)[] = [];
  private currentTime: number = 0;
  private totalDuration: number = 32; // 32 seconds preview
  private audioElement: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(callback: (isPlaying: boolean, packId: string | null, progress: number) => void) {
    this.onStateChangeListeners.push(callback);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter(cb => cb !== callback);
    };
  }

  private notify(progress: number) {
    this.onStateChangeListeners.forEach(cb => cb(this.isPlaying, this.currentPackId, progress));
  }

  public play(
    packId: string,
    style: 'piseiro' | 'forro' | 'arrocha' | 'sertanejo' | 'pagode' = 'piseiro',
    audioUrl?: string
  ) {
    try {
      this.initCtx();
    } catch {
      // Audio context might be restricted
    }

    if (this.currentPackId === packId && this.isPlaying) {
      this.pause();
      return;
    }

    this.stop();
    this.currentPackId = packId;
    this.currentAudioUrl = audioUrl || null;
    this.isPlaying = true;
    this.currentTime = 0;

    if (audioUrl && audioUrl.trim().length > 0) {
      try {
        const audio = new Audio(audioUrl.trim());
        this.audioElement = audio;
        audio.volume = this.volume;

        audio.onended = () => {
          this.stop();
        };

        audio.onerror = () => {
          console.warn('Audio URL playback error, falling back to synth:', audioUrl);
          this.audioElement = null;
          this.startSynthLoop(style);
          this.startSyntheticProgress();
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            const progress = (audio.currentTime / audio.duration) * 100;
            this.notify(progress);
          }
        };

        audio.play().catch((err) => {
          console.warn('Audio autoplay failed, falling back to synth:', err);
          this.audioElement = null;
          this.startSynthLoop(style);
          this.startSyntheticProgress();
        });
      } catch {
        this.startSynthLoop(style);
        this.startSyntheticProgress();
      }
    } else {
      this.startSynthLoop(style);
      this.startSyntheticProgress();
    }

    this.notify(0);
  }

  private startSyntheticProgress() {
    if (this.progressInterval) window.clearInterval(this.progressInterval);
    this.progressInterval = window.setInterval(() => {
      this.currentTime += 0.25;
      const progress = (this.currentTime / this.totalDuration) * 100;
      if (this.currentTime >= this.totalDuration) {
        this.stop();
      } else {
        this.notify(progress);
      }
    }, 250);
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.clearTimers();
    this.notify((this.currentTime / this.totalDuration) * 100);
  }

  public resume(
    style: 'piseiro' | 'forro' | 'arrocha' | 'sertanejo' | 'pagode' = 'piseiro',
    audioUrl?: string
  ) {
    if (!this.currentPackId) return;
    this.isPlaying = true;

    if (this.audioElement) {
      this.audioElement.play().catch(() => {});
    } else if (audioUrl || this.currentAudioUrl) {
      this.play(this.currentPackId, style, audioUrl || this.currentAudioUrl || undefined);
      return;
    } else {
      this.startSynthLoop(style);
      this.startSyntheticProgress();
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    this.clearTimers();
    const prevId = this.currentPackId;
    this.currentPackId = null;
    this.currentAudioUrl = null;
    this.currentTime = 0;
    this.onStateChangeListeners.forEach(cb => cb(false, prevId, 0));
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public getVolume() {
    return this.volume;
  }

  public getCurrentPackId() {
    return this.currentPackId;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  private clearTimers() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.progressInterval !== null) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private startSynthLoop(style: string) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Tempo in BPM
    let bpm = 138;
    if (style === 'arrocha') bpm = 118;
    if (style === 'sertanejo') bpm = 124;
    if (style === 'forro') bpm = 142;
    if (style === 'pagode') bpm = 100;

    const beatInterval = (60 / bpm) * 1000;
    let step = 0;

    // Chords progression (Brazilian Forró/Piseiro Em - C - G - D)
    const chords = [
      [164.81, 196.00, 246.94], // Em
      [130.81, 164.81, 196.00], // C
      [196.00, 246.94, 293.66], // G
      [146.83, 185.00, 220.00], // D
    ];
    const bassNotes = [82.41, 65.41, 98.00, 73.42];

    const playStep = () => {
      if (!this.isPlaying || !ctx) return;
      const now = ctx.currentTime;
      const bar = Math.floor(step / 4) % chords.length;
      const beatInBar = step % 4;

      // Bass note on beats 0 and 2
      if (beatInBar === 0 || beatInBar === 2) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassNotes[bar], now);
        
        // Low pass filter for warm synth bass
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
      }

      // Snare / Zabumba / Rimshot on offbeats (Piseiro kick-snare feel)
      if (beatInBar === 1 || beatInBar === 3 || (style === 'piseiro' && beatInBar === 2)) {
        const noise = ctx.createBufferSource();
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = style === 'pagode' ? 1800 : 1200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.08);
      }

      // Accordion / Keyboard chord stabs (characteristic syncopated rhythm)
      const currentChord = chords[bar];
      currentChord.forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq * (idx === 0 ? 2 : 2), now);

        chordGain.gain.setValueAtTime(0.08 * this.volume, now);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);

        chordOsc.start(now);
        chordOsc.stop(now + 0.2);
      });

      step++;
    };

    playStep();
    this.timerId = window.setInterval(playStep, beatInterval / 2);
  }
}

export const audioPlayer = new PreviewAudioPlayer();
