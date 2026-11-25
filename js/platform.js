/*
 * Kropki — integracja z CrazyGames SDK v3.
 * Gra działa również bez SDK (GitHub Pages, plik lokalny): wtedy wszystkie wywołania są pomijane.
 * Dokumentacja: https://docs.crazygames.com/sdk/intro/
 */
(function (root) {
  'use strict';

  const P = {
    sdk: null,
    environment: 'none',
    locale: null,
    deviceType: null,
    muted: false,
    playing: false,
    onSettings: null,

    async init() {
      const SDK = root.CrazyGames && root.CrazyGames.SDK;
      if (!SDK) return;
      try {
        // Nie blokuj gry, gdyby init trwał zbyt długo
        await Promise.race([SDK.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        this.environment = SDK.environment;
        if (this.environment !== 'local' && this.environment !== 'crazygames') return;
        this.sdk = SDK;
        const info = SDK.user && SDK.user.systemInfo;
        if (info) {
          this.locale = info.locale || null;
          this.deviceType = info.device && info.device.type;
        }
        const s = SDK.game.settings;
        this.muted = !!(s && s.muteAudio);
        SDK.game.addSettingsChangeListener((ns) => {
          this.muted = !!(ns && ns.muteAudio);
          if (this.onSettings) this.onSettings(ns);
        });
      } catch (e) {
        this.sdk = null;
      }
    },

    // Wywoływane, gdy rozgrywka się zaczyna lub wznawia
    gameplayStart() {
      if (this.playing) return;
      this.playing = true;
      this._call('gameplayStart');
    },
    // Wywoływane przy każdej przerwie: menu, zasady, koniec gry
    gameplayStop() {
      if (!this.playing) return;
      this.playing = false;
      this._call('gameplayStop');
    },
    // Rzadkie, wyjątkowe osiągnięcie (np. wygrana z trudnym komputerem)
    happytime() { this._call('happytime'); },

    // Wspólny interfejs z js/platform-playgama.js (na CrazyGames: zapis lokalny, bez reklam)
    paused: false,
    rewardedSupported: false,
    onPause: null,
    async load() {
      const out = {};
      ['lang', 'mode', 'size', 'sound', 'seenRules', 'wins', 'losses', 'draws', 'color1', 'color2', 'starter', 'seenTutorial'].forEach((k) => {
        try { out[k] = localStorage.getItem('kropki.' + k); } catch (e) { out[k] = null; }
      });
      return out;
    },
    save(obj) {
      Object.keys(obj).forEach((k) => { try { localStorage.setItem('kropki.' + k, String(obj[k])); } catch (e) { /* brak */ } });
    },
    gameReady() {}, levelStarted() {}, levelCompleted() {}, levelFailed() {},
    interstitial() {},
    rewarded(placement, onReward, onFail) { if (onFail) onFail(); },

    _call(name) {
      if (!this.sdk) return;
      try { this.sdk.game[name](); } catch (e) { /* ignoruj */ }
    },
  };

  root.KropkiPlatform = P;
})(window);
