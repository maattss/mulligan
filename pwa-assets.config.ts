import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(minimal2023Preset, {
    padding: 0.3,
    resizeOptions: {
      background: '#EFEAD8',
      fit: 'contain',
    },
    darkResizeOptions: {
      background: '#17332A',
      fit: 'contain',
    },
    linkMediaOptions: {
      log: true,
      addMediaScreen: true,
      basePath: '/',
      xhtml: true,
    },
  }),
  images: ['public/mulligan.svg'],
})
