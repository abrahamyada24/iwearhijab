import { create } from 'twrnc';

// Shared with the web login. Existing blue utilities now use the brand palette.
export const brand = '#a8747a';
export default create({
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#faf3f4',
          100: '#f3e5e7',
          200: '#e5cbd0',
          300: '#d3adb4',
          400: '#bd9499',
          500: '#b58088',
          600: brand,
          700: '#96656b',
          800: '#7c5058',
          900: '#57373e',
          950: '#321d23',
        },
      },
    },
  },
});
