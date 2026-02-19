import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712';

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

  const showAd = () => {
    const now = Date.now();
    const canShow = (now - lastShownTime) >= AD_COOLDOWN_MS;
    console.log('InterstitialAd: Attempting to show ad.');
    console.log(`  - loaded: ${loaded}`);
    console.log(`  - canShow (cooldown): ${canShow}`);
    console.log(`  - time since last shown: ${now - lastShownTime}ms (cooldown: ${AD_COOLDOWN_MS}ms)`);

    if (loaded && canShow) {
      console.log('InterstitialAd: Showing ad.');
      interstitial.show();
    } else if (loaded && !canShow) {
      console.log('Ad skipped: Cooldown active');
    } else {
      console.log('Ad not loaded yet. Attempting to load.');
      interstitial.load();
    }
  };

  return { showAd, loaded };
}
