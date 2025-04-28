module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          gradient: 'linear-gradient(90deg, #000f9b, #eb0000, #a000eb)',
        },
        background: '#0a0a0a',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
