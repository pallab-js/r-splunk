/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'black': '#000000',
        'near-black': '#262626',
        'darkest-surface': '#090909',
        'white': '#ffffff',
        'snow': '#fafafa',
        'light-gray': '#e5e5e5',
        'stone': '#737373',
        'mid-gray': '#525252',
        'silver': '#a3a3a3',
        'border-light': '#d4d4d4',
      },
      fontFamily: {
        'display': ['"SF Pro Rounded"', 'system-ui', '-apple-system', 'sans-serif'],
        'body': ['ui-sans-serif', 'system-ui', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'pill': '9999px',
        'container': '12px',
      },
      spacing: {
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
        '28': '7rem',   // 112px
      },
    },
  },
  plugins: [],
};
