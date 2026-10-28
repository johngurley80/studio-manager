/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f0b09', 2: '#16100d', 3: '#1f1712', 4: '#2a1f18' },
        line: { DEFAULT: '#3a2b20', soft: '#2c2119' },
        cream: { DEFAULT: '#f4e7cf', dim: '#cdbb9c', mute: '#9a8669' },
        gold: { DEFAULT: '#f2c14e', deep: '#d99a28', soft: '#f7d98f' },
        ember: { DEFAULT: '#e0682b', deep: '#b84a1c' },
        rouge: { DEFAULT: '#c2362b', soft: '#e0563f' },
        teal: { DEFAULT: '#3fa7a0', soft: '#6cc7bf' },
        leaf: { DEFAULT: '#8bc172' },
      },
      fontFamily: {
        display: ['Shrikhand', 'Georgia', 'serif'],
        poster: ['Oswald', 'Impact', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        cond: ['"Barlow Condensed"', 'Barlow', 'sans-serif'],
      },
      boxShadow: {
        marquee: '0 0 0 1px rgba(242,193,78,.35), 0 10px 30px -10px rgba(0,0,0,.8)',
        glow: '0 0 24px rgba(242,193,78,.45)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
        pop: { '0%': { opacity: '0', transform: 'scale(.6) rotate(-8deg)' }, '70%': { opacity: '1', transform: 'scale(1.08) rotate(-4deg)' }, '100%': { transform: 'scale(1) rotate(-4deg)' } },
        sweep: { '0%': { transform: 'translateX(-60%) rotate(18deg)' }, '100%': { transform: 'translateX(160%) rotate(18deg)' } },
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.82' } },
        bulbs: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '24px 0' } },
      },
      animation: {
        rise: 'rise .35s ease-out both',
        pop: 'pop .5s cubic-bezier(.2,1.4,.4,1) both',
        sweep: 'sweep 1.6s ease-in-out infinite',
        flicker: 'flicker 2.4s ease-in-out infinite',
        bulbs: 'bulbs .8s linear infinite',
      },
    },
  },
  plugins: [],
};
