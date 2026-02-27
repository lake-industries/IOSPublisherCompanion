/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 */

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
