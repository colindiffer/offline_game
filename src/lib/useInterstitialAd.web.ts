import { useCallback } from 'react';

export function useInterstitialAd() {
    // No-op on web
    const showAd = useCallback((_isFirstLevelOrGame: boolean = false) => {}, []);
    return { showAd };
}
