/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: './tailwind.config.next.js' },
    autoprefixer: {},
  },
}

export default config
