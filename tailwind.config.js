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
        // Brand
        'supabase-green': '#3ecf8e',
        'green-link': '#00c573',
        'green-border': 'rgba(62, 207, 142, 0.3)',
        
        // Neutral Scale (Dark Mode)
        'near-black': '#0f0f0f',
        'dark': '#171717',
        'dark-border': '#242424',
        'border-dark': '#2e2e2e',
        'mid-border': '#363636',
        'border-light': '#393939',
        'charcoal': '#434343',
        'dark-gray': '#4d4d4d',
        'mid-gray': '#898989',
        'light-gray': '#b4b4b4',
        'near-white': '#efefef',
        'off-white': '#fafafa',

        // Radix Color Tokens (HSL-based mapping)
        'slate-5': 'hsl(210, 87.8%, 16.1%)',
        'purple-4': 'hsl(250, 43%, 20%)',
        'purple-5': 'hsl(250, 43%, 25%)',
        'violet-10': 'hsl(251, 63.2%, 63.2%)',
        'crimson-4': 'hsl(335, 43%, 20%)',
        'yellow-A7': 'hsla(50, 100%, 50%, 0.7)',
        'tomato-A4': 'hsla(10, 100%, 50%, 0.4)',
        'orange-6': 'hsl(30, 100%, 50%)',
      },
      fontFamily: {
        'display': ['Circular', 'custom-font', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        'body': ['Circular', 'custom-font', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['"Source Code Pro"', 'Office Code Pro', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'pill': '9999px',
        '6': '6px',
        '8': '8px',
        '11': '11px',
        '12': '12px',
        '16': '16px',
      },
      letterSpacing: {
        'technical': '1.2px',
        'card-title': '-0.16px',
      },
      lineHeight: {
        'hero': '1.00',
      },
    },
  },
  plugins: [],
};
