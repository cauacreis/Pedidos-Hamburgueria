const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Garante android:usesCleartextTraffic="true" no AndroidManifest.xml
 * para permitir conexões ws:// na rede local / Hotspot sem internet.
 */
function withCleartextTraffic(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    if (application && application.$) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return manifestConfig;
  });
}

module.exports = withCleartextTraffic;
