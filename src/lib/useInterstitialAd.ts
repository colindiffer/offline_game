import { useCallback } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const PRODUCTION_INTERSTITIAL_ID = Platform.select({
  ios: 'ca-app-pub-7047560171408604/8910007522',
  android: 'ca-app-pub-7047560171408604/4845503969',
  default: 'ca-app-pub-7047560171408604/4845503969',
});

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : PRODUCTION_INTERSTITIAL_ID!;

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

let lastShownTime = 0;
let isLoaded = false;
const AD_COOLDOWN_MS = 90 * 1000; // 90 seconds

// Set up listeners once at module level — avoids duplicate listeners
// from multiple hook instances competing over the same singleton ad object.
interstitial.addAdEventListener(AdEventType.LOADED, () => {
  console.log('InterstitialAd: LOADED');
  isLoaded = true;
});

interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  console.log('InterstitialAd: CLOSED');
  isLoaded = false;
  lastShownTime = Date.now();
  interstitial.load();
});

interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
  console.log('InterstitialAd: ERROR', error.message);
  isLoaded = false;
  // Retry loading after a short delay
  setTimeout(() => interstitial.load(), 5000);
});

// Load the first ad immediately on import
interstitial.load();

export function useInterstitialAd() {
  // isFirstLevelOrGame parameter kept for call-site compatibility but no longer skips the ad.
  // Ads now show on every game/level end, subject to the 90-second cooldown.
  const showAd = useCallback((_isFirstLevelOrGame: boolean = false) => {
    const now = Date.now();
    const canShowDueToCooldown = (now - lastShownTime) >= AD_COOLDOWN_MS;

    console.log('InterstitialAd: Attempting to show ad.');
    console.log(`  - isLoaded: ${isLoaded}`);
    console.log(`  - canShowDueToCooldown: ${canShowDueToCooldown}`);
    console.log(`  - time since last shown: ${now - lastShownTime}ms (cooldown: ${AD_COOLDOWN_MS}ms)`);

    if (isLoaded && canShowDueToCooldown) {
      console.log('InterstitialAd: Showing ad.');
      interstitial.show();
    } else {
      console.log(`InterstitialAd: Skipped — ${!isLoaded ? 'not loaded yet' : 'cooldown active'}`);
    }
  }, []);

  return { showAd };
}
