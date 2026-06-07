import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e8455c',
          light: '#ff6b81',
          bg: '#fff0f2',
        },
        accent: {
          blue: '#2d9cdb',
          green: '#27ae60',
          orange: '#f2994a',
        },
      },
    },
  },
  plugins: [],
}
export default config
