/**
 * 玉勅代天府德慈宮 - V3 混合式空間音訊引擎（對齊 park-audio.mjs 架構）
 * ------------------------------------------------------------
 * 1. 真實編曲主配樂：優先載入 `./assets/audio/temple-bgm.mp3`（國風 Lo-Fi 輕音樂），
 *    支援 1500ms 絲滑淡入淡出（requestAnimationFrame Fade）與克制基準音量。
 * 2. 情境自動壓低混音（Ducking）：進入「跪坐念經模式」時，主配樂自動平滑壓低至 22%，
 *    讓木魚聲與靜心冥想氛圍清晰呈現；起身後平滑回升至 100%。
 * 3. Web Audio 程式化互動音效：溫潤木魚、清脆擲筊、柔和鐘磬、金紙翻飛與化金火焰聲，
 *    並於無 MP3 時自動無縫降級為柔和五聲 Lo-Fi 合成伴奏。
 */
const BGM_URL = './assets/audio/temple-bgm.mp3';

class TempleSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.userVolume = 0.55; // 預設舒適耐聽音量
    this.duckFactor = 1.0;  // 1.0 = 正常, 0.22 = 念經模式壓低背景樂
    this.targetDuck = 1.0;

    // HTML5 Audio 主配樂（支援真 MP3 絲滑淡入淡出）
    this.bgmAudio = new Audio();
    this.bgmAudio.src = BGM_URL;
    this.bgmAudio.loop = true;
    this.bgmAudio.preload = 'auto';
    this.bgmAudio.volume = 0;

    this.bgmActive = false;
    this.bgmUsingMp3 = true;
    this.bgmCurrentVol = 0;
    this.fadeRaf = null;

    // 降級備援合成器
    this.fallbackTimer = null;
    this.stepIndex = 0;

    this.bgmAudio.addEventListener('error', () => {
      this.bgmUsingMp3 = false;
      if (this.bgmActive && !this.muted) {
        this._startFallbackSynth();
      }
    });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.userVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _getTargetBgmVolume() {
    if (this.muted || !this.bgmActive) return 0;
    // 主配樂上限設為舒適克制的 0.62 * userVolume * duckFactor
    return Math.max(0, Math.min(1, this.userVolume * 0.62 * this.duckFactor));
  }

  _runFadeLoop() {
    if (this.fadeRaf) return;
    const step = () => {
      this.duckFactor += (this.targetDuck - this.duckFactor) * 0.06;
      const desired = this._getTargetBgmVolume();
      this.bgmCurrentVol += (desired - this.bgmCurrentVol) * 0.055;

      if (Math.abs(desired - this.bgmCurrentVol) < 0.002) {
        this.bgmCurrentVol = desired;
      }

      if (this.bgmUsingMp3) {
        try {
          this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmCurrentVol));
          if (this.muted && this.bgmCurrentVol <= 0.002 && !this.bgmAudio.paused) {
            this.bgmAudio.pause();
          }
        } catch (_) {}
      }

      if (
        Math.abs(desired - this.bgmCurrentVol) > 0.002 ||
        Math.abs(this.targetDuck - this.duckFactor) > 0.005
      ) {
        this.fadeRaf = requestAnimationFrame(step);
      } else {
        this.fadeRaf = null;
      }
    };
    this.fadeRaf = requestAnimationFrame(step);
  }

  /**
   * 啟動主配樂（1500ms 絲滑淡入）
   */
  startAmbient() {
    this.bgmActive = true;
    this.ensureContext();
    if (this.muted) return;

    if (this.bgmUsingMp3) {
      const p = this.bgmAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // 若瀏覽器尚未解鎖或檔案不可播，不報錯，待下次互動或降級
        });
      }
      this._runFadeLoop();
    } else {
      this._startFallbackSynth();
    }
  }

  stopAmbient() {
    this.bgmActive = false;
    this._stopFallbackSynth();
    this._runFadeLoop();
  }

  /**
   * 空間／情境音訊壓低混音（如念經模式壓低至 0.22，離開恢復 1.0）
   */
  setMusicDucking(factor = 1.0) {
    this.targetDuck = Math.max(0.12, Math.min(1.0, factor));
    this._runFadeLoop();
  }

  setVolume(val) {
    this.userVolume = Math.max(0, Math.min(1, Number(val)));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.userVolume, this.ctx.currentTime, 0.04);
    }
    this._runFadeLoop();
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(isMuted ? 0 : this.userVolume, this.ctx.currentTime, 0.05);
    }
    if (isMuted) {
      this._stopFallbackSynth();
    } else if (this.bgmActive) {
      this.startAmbient();
    }
    this._runFadeLoop();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * 無 MP3 時的優雅降級：柔和五聲 Lo-Fi 合成器
   */
  _startFallbackSynth() {
    if (this.fallbackTimer || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const melody = [392, 440, 523.25, 0, 440, 392, 329.63, 0, 293.66, 329.63, 392, 440, 392, 0, 329.63, 293.66];
    const tick = () => {
      if (this.muted || !this.bgmActive || this.bgmUsingMp3) {
        this.fallbackTimer = null;
        return;
      }
      const freq = melody[this.stepIndex % melody.length];
      if (freq > 0) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.value = 1300;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.07 * this.duckFactor, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.56);
      }
      this.stepIndex++;
      this.fallbackTimer = setTimeout(tick, 310);
    };
    tick();
  }

  _stopFallbackSynth() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  // =========================================================================
  // 程式化民俗互動音效（柔和中頻、絕不刺耳）
  // =========================================================================
  playBell(volume = 0.22, baseFreq = 392) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [1, 2.0].forEach((mult, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * mult, now);

      const amp = volume / (idx * 1.9 + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + (2.0 - idx * 0.5));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.1);
    });
  }

  playWoodenFish() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(295, now + 0.085);

    filter.type = 'lowpass';
    filter.frequency.value = 1050;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  playMoonBlocks() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const hits = [
      { delay: 0.08, freq: 720, vol: 0.34 },
      { delay: 0.16, freq: 640, vol: 0.30 },
      { delay: 0.29, freq: 780, vol: 0.20 },
      { delay: 0.40, freq: 690, vol: 0.14 },
      { delay: 0.52, freq: 660, vol: 0.08 }
    ];

    hits.forEach(({ delay, freq, vol }) => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.58, t + 0.055);

      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 2.6;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  playPaperToss() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.26;

    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.52;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(1080, now + dur);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  playFireBurn() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 2.6;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 1.2;
      if (Math.random() < 0.0007) data[i] += (Math.random() - 0.5) * 1.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(460, now);
    filter.frequency.linearRampToValueAtTime(820, now + 1.0);
    filter.frequency.linearRampToValueAtTime(360, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  playBlessingChime() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [392.00, 440.00, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.78);
    });
  }

  playSoftClick() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(410, now + 0.04);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEngine = new TempleSoundEngine();
