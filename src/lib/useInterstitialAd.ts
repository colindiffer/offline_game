import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// TODO: Replace these with your real AdMob ad unit IDs from admob.google.com
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
const AD_COOLDOWN_MS = 90 * 1000; // 90 seconds

export function useInterstitialAd() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('InterstitialAd: LOADED');
      setLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('InterstitialAd: CLOSED');
      setLoaded(false);
      lastShownTime = Date.now();
      interstitial.load();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('InterstitialAd: ERROR', error.message);
      setLoaded(false);
    });

    // Start loading the first ad
    console.log('InterstitialAd: Initial load attempt');
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const showAd = useCallback((isFirstLevelOrGame: boolean = false) => {
    if (isFirstLevelOrGame) {
      console.log('InterstitialAd: Ad skipped because it is the first level/game.');
      return;
    }

    const now = Date.now();
    const canShowDueToCooldown = (now - lastShownTime) >= AD_COOLDOWN_MS;
    console.log('InterstitialAd: Attempting to show ad.');
    console.log(`  - loaded: ${loaded}`);
    console.log(`  - canShowDueToCooldown: ${canShowDueToCooldown}`);
    console.log(`  - time since last shown: ${now - lastShownTime}ms (cooldown: ${AD_COOLDOWN_MS}ms)`);

    if (loaded && canShowDueToCooldown) {
      console.log('InterstitialAd: Showing ad.');
      interstitial.show();
    } else if (loaded && !canShowDueToCooldown) {
      console.log('Ad skipped: Cooldown active');
      // Ad is loaded but cooldown is active, try to load a new one for next time
      interstitial.load();
    } else {
      console.log('Ad not loaded yet. Attempting to load for next opportunity.');
      // Ad not loaded, try to load it. This will make it ready for the next call to showAd
      interstitial.load();
    }
  }, [loaded]);

  return { showAd, loaded };
}
