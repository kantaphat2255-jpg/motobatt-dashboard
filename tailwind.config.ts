import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#F5C400',
          black: '#111111',
        },
        surface: {
          DEFAULT: '#1C1C1C',
          raised: '#242424',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['var(--font-sarabun)', 'Sarabun', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
