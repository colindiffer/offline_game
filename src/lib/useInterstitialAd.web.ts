import { useState } from 'react';

export function useInterstitialAd() {
    const [loaded] = useState(false);

    const showAd = () => {
        // No-op on web
    };

    return { showAd, loaded };
}
