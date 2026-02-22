const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Check if already modified
    if (contents.includes('MYAPP_UPLOAD_STORE_FILE')) {
      return config;
    }

    // Find the signingConfigs section and add release config
    const signingConfigsRegex = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*)(})/;
    
    contents = contents.replace(
      signingConfigsRegex,
      `$1        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    $2`
    );

    // Change release signingConfig from debug to release
    contents = contents.replace(
      /release\s*\{([^}]*?)signingConfig\s+signingConfigs\.debug/s,
      'release {$1signingConfig signingConfigs.release'
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidSigning;
