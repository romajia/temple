/**
 * Web Audio API 傳統儀式音效合成器（零外部檔案依賴、支援靜音切換）
 * - 播種清鈴（請香火苗）
 * - 朱印落章重擊＋青銅磬鐘餘韻（顯化御朱印）
 * - 結緣核銷清音
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
  }

  ensureContext() {
    if (!this.enabled) return null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * 溫潤廟鈴清音（請香火苗／點擊互動）
   */
  playSeedChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.11, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.08 + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.7);
    });
  }

  /**
   * 朱紅御朱印落章動畫音效：厚實木印蓋下聲 ＋ 溫暖銅磬祝福餘韻
   */
  playStampSeal() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 印章厚實落紙低頻
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(145, now);
    thud.frequency.exponentialRampToValueAtTime(42, now + 0.14);

    thudGain.gain.setValueAtTime(0.32, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.2);

    // 2. 儀式銅磬五聲和弦餘韻
    const bellFreqs = [392.0, 587.33, 783.99, 1174.66];
    bellFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const start = now + 0.16 + idx * 0.04;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.09 / (idx + 1) + 0.03, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0006, start + 1.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.6);
    });
  }

  /**
   * 輕柔木魚點擊音
   */
  playTap() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundFX = new SoundFX();
