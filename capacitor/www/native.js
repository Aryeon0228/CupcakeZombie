// Native bridge for the Capacitor build. Loaded after vendor/capacitor.js + plugin IIFEs, before the game.
// The game only talks to window.CZ_HAPTICS, window.CZ_NATIVE_ADS and window.CZ_NATIVE_STORE,
// so swapping ad / store providers never touches game code.
(function () {
  var Cap = window.Capacitor;
  var native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  if (typeof capacitorHaptics !== 'undefined') window.CZ_HAPTICS = capacitorHaptics.Haptics;
  if (!native) return;
  try { capacitorStatusBar.StatusBar.setStyle({ style: 'LIGHT' }); } catch (e) {}
  try { capacitorSplashScreen.SplashScreen.hide(); } catch (e) {}

  // ---- Ads: install @capacitor-community/admob, copy its dist/plugin.js to vendor/admob.js, then fill in ----
  // Rewarded: 'hint' (힌트 +1) and 'spore' (포자 +1). Interstitial: after every 3rd clear from stage 4 on, unless 광고 제거 was bought.
  // window.CZ_NATIVE_ADS = {
  //   rewarded: async function (kind) {
  //     var AdMob = capacitorCommunityAdmob.AdMob;
  //     await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-XXXX/REWARDED' });
  //     var r = await AdMob.showRewardVideoAd();
  //     return !!(r && r.type);   // reward granted
  //   },
  //   interstitial: async function () {
  //     var AdMob = capacitorCommunityAdmob.AdMob;
  //     await AdMob.prepareInterstitial({ adId: 'ca-app-pub-XXXX/INTERSTITIAL' });
  //     await AdMob.showInterstitial();
  //     return true;
  //   }
  // };
  // Also call AdMob.initialize({ requestTrackingAuthorization: true }) once at startup (ATT prompt on iOS).

  // ---- Store: StoreKit through RevenueCat (@revenuecat/purchases-capacitor) or a StoreKit plugin ----
  // Product id: 'remove_ads' (non-consumable).
  // window.CZ_NATIVE_STORE = {
  //   buy: async function (productId) { ... return purchased; },
  //   restore: async function () { ... return hasRemoveAds; }
  // };
})();
