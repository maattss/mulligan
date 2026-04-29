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
    name: (landscape, size, dark) => {
      const orientation = landscape ? 'landscape' : 'portrait'
      const variant = dark ? 'dark' : 'light'
      return `apple-splash-${orientation}-${variant}-${size.width}x${size.height}.png`
    },
  }),
  images: ['public/mulligan.svg'],
})
