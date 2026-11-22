/*
 * Kropki — integracja z Playgama Bridge SDK (wersja dla Playgama).
 * Ten sam interfejs co js/platform.js (CrazyGames), plus reklamy, zapis i pauza.
 * Dokumentacja: https://wiki.playgama.com/playgama/bridge-sdk/api
 */
(function (root) {
  'use strict';

  const KEYS = ['lang', 'mode', 'size', 'sound', 'seenRules', 'wins', 'losses', 'draws'];

  const P = {
    sdk: null,
    environment: 'none',
    locale: null,
    muted: false,          // dźwięk wyłączony przez platformę
    paused: false,         // gra wstrzymana przez platformę (reklama, zmiana karty)
    playing: false,
    rewardedSupported: false,
    onSettings: null,      // (wywoływane przy zmianie wyciszenia)
    onPause: null,         // (isPaused) => void
    _rewardCb: null,
    _rewardFailCb: null,
    _rewardGranted: false,

    async init() {
      const B = root.bridge;
      if (!B) return;
      try {
        await B.initialize();
        this.sdk = B;
        this.environment = B.platform.id;
        this.locale = B.platform.language || null;
        this.muted = B.platform.isAudioEnabled === false;
        this.rewardedSupported = !!B.advertisement.isRewardedSupported;
        B.platform.on(B.EVENT_NAME.AUDIO_STATE_CHANGED, (enabled) => {
          this.muted = !enabled;
          if (this.onSettings) this.onSettings();
        });
        B.platform.on(B.EVENT_NAME.PAUSE_STATE_CHANGED, (isPaused) => {
          this.paused = !!isPaused;
          if (this.onPause) this.onPause(this.paused);
        });
        B.advertisement.on(B.EVENT_NAME.REWARDED_STATE_CHANGED, (st) => this._onRewarded(st));
        if (B.advertisement.interstitialState === 'opened') {
          this.paused = true;
        }
      } catch (e) {
        this.sdk = null;
      }
    },

    // ---------- zapis (tylko przez Bridge Storage) ----------
    async load() {
      const out = {};
      if (!this.sdk) {
        KEYS.forEach((k) => { try { out[k] = localStorage.getItem('kropki.' + k); } catch (e) { out[k] = null; } });
        return out;
      }
      try {
        const vals = await this.sdk.storage.get(KEYS);
        KEYS.forEach((k, i) => { out[k] = vals && vals[i] != null ? String(vals[i]) : null; });
      } catch (e) { KEYS.forEach((k) => { out[k] = null; }); }
      return out;
    },
    save(obj) {
      const keys = Object.keys(obj);
      if (!keys.length) return;
      if (!this.sdk) {
        keys.forEach((k) => { try { localStorage.setItem('kropki.' + k, String(obj[k])); } catch (e) { /* brak */ } });
        return;
      }
      this.sdk.storage.set(keys, keys.map((k) => String(obj[k]))).catch(() => {});
    },

    // ---------- komunikaty cyklu życia ----------
    gameReady() { this._msg('game_ready'); },
    levelStarted() { this._msg('level_started'); },
    levelCompleted() { this._msg('level_completed'); },
    levelFailed() { this._msg('level_failed'); },
    gameplayStart() {
      if (this.playing) return;
      this.playing = true;
      this._msg('level_resumed');
    },
    gameplayStop() {
      if (!this.playing) return;
      this.playing = false;
      this._msg('level_paused');
    },
    happytime() { this._msg('player_got_achievement'); },
    _msg(m) {
      if (!this.sdk) return;
      try { this.sdk.platform.sendMessage(m); } catch (e) { /* ignoruj */ }
    },

    // ---------- reklamy ----------
    // Pełnoekranowa reklama na naturalnej przerwie. Bridge sam pilnuje odstępów.
    interstitial(placement) {
      if (!this.sdk || !this.sdk.advertisement.isInterstitialSupported) return;
      try { this.sdk.advertisement.showInterstitial(placement); } catch (e) { /* ignoruj */ }
    },
    // Reklama z nagrodą: onReward tylko w stanie "rewarded", onFail gdy się nie udało.
    rewarded(placement, onReward, onFail) {
      if (!this.sdk || !this.rewardedSupported) { if (onFail) onFail(); return; }
      this._rewardCb = onReward;
      this._rewardFailCb = onFail;
      this._rewardGranted = false;
      try { this.sdk.advertisement.showRewarded(placement); } catch (e) { this._finishRewarded(false); }
    },
    _onRewarded(st) {
      if (st === 'rewarded') {
        this._rewardGranted = true;
        const cb = this._rewardCb; this._rewardCb = null; this._rewardFailCb = null;
        if (cb) cb();
      } else if (st === 'failed' || (st === 'closed' && !this._rewardGranted)) {
        this._finishRewarded(false);
      }
    },
    _finishRewarded() {
      const f = this._rewardFailCb; this._rewardCb = null; this._rewardFailCb = null;
      if (f) f();
    },
  };

  root.KropkiPlatform = P;
})(window);
