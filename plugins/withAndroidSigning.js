const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('MYAPP_UPLOAD_STORE_FILE')) {
      return config;
    }

    // Add release signing config
    config.modResults.contents = config.modResults.contents.replace(
      /signingConfigs\s*\{[^}]*\}/,
      `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }`
    );

    // Change release build to use release signing config
    config.modResults.contents = config.modResults.contents.replace(
      /release\s*\{[^}]*signingConfig\s+signingConfigs\.debug/,
      `release {
            signingConfig signingConfigs.release`
    );

    return config;
  });
};

module.exports = withAndroidSigning;
