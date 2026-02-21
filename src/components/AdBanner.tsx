import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// TODO: Replace these with your real AdMob ad unit IDs from admob.google.com
const PRODUCTION_BANNER_ID = Platform.select({
  ios: 'ca-app-pub-7047560171408604/7105536498',
  android: 'ca-app-pub-7047560171408604/6266396846',
  default: 'ca-app-pub-7047560171408604/6266396846',
});

const adUnitId = __DEV__ ? TestIds.BANNER : PRODUCTION_BANNER_ID!;

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 50,
  },
});
