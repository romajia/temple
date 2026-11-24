/**
 * 模組 A 頂部視覺：台灣傳統暖光燈籠簷廊 ＋ 無障礙工具列（語系／夜間模式／大字體／音效）
 */

import { t, getLanguage } from '../services/i18n.js';

export function renderLanternHeader(state) {
  const lanterns = t('lanterns');
  const lang = getLanguage();
  const isNight = state.preferences.theme === 'night';
  const isLarge = state.preferences.largeFont;
  const soundOn = state.preferences.soundEnabled;

  const lanternHtml = lanterns
    .map((phrase, idx) => {
      const chars = phrase.split('').map((c) => `<span>${c}</span>`).join('');
      return `
        <div class="lantern-unit lantern-delay-${idx}" aria-hidden="true">
          <div class="lantern-cord"></div>
          <div class="lantern-cap lantern-cap-top"></div>
          <div class="lantern-body">
            <div class="lantern-ribs"></div>
            <div class="lantern-text">${chars}</div>
          </div>
          <div class="lantern-cap lantern-cap-bottom"></div>
          <div class="lantern-tassel"></div>
        </div>
      `;
    })
    .join('');

  return `
    <header class="temple-canopy" role="banner">
      <div class="canopy-utility-bar">
        <div class="canopy-brand-mini">
          <img src="./assets/icon-192.png" alt="御朱燈影" class="brand-mini-icon" />
          <span class="brand-mini-name">${t('appTitle')}</span>
        </div>

        <div class="canopy-controls" role="toolbar" aria-label="閱讀與介面設定">
          <div class="lang-switch" role="group" aria-label="語言切換">
            <button type="button" class="util-chip ${lang === 'zh-TW' ? 'is-active' : ''}" data-action="set-lang" data-lang="zh-TW">繁中</button>
            <button type="button" class="util-chip ${lang === 'en' ? 'is-active' : ''}" data-action="set-lang" data-lang="en">EN</button>
            <button type="button" class="util-chip ${lang === 'ja' ? 'is-active' : ''}" data-action="set-lang" data-lang="ja">日本語</button>
          </div>
          <button type="button" class="util-btn ${isLarge ? 'is-active' : ''}" data-action="toggle-font" title="放大字體，適合長輩與戶外閱讀">
            <span>A+</span>
            <span class="util-btn-label">${isLarge ? t('fontLarge') : t('fontNormal')}</span>
          </button>
          <button type="button" class="util-btn ${isNight ? 'is-active' : ''}" data-action="toggle-theme" title="切換和紙日間／慶典夜燈模式">
            <span>${isNight ? '🏮' : '📜'}</span>
            <span class="util-btn-label">${isNight ? t('nightModeOn') : t('dayModeOn')}</span>
          </button>
          <button type="button" class="util-btn ${soundOn ? '' : 'is-muted'}" data-action="toggle-sound" title="切換儀式音效">
            <span>${soundOn ? '🔔' : '🔇'}</span>
          </button>
        </div>
      </div>

      <div class="lantern-eaves">
        <div class="eaves-beam"></div>
        <div class="lantern-row">
          ${lanternHtml}
        </div>
      </div>
    </header>
  `;
}
