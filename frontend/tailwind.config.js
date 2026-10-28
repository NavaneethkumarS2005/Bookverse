/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                outfit: ['Source Serif 4', 'Georgia', 'serif'],
                inter: ['DM Sans', 'sans-serif'],
                serif: ['Source Serif 4', 'Georgia', 'serif'],
                sans: ['DM Sans', 'sans-serif'],
                mono: ['DM Mono', 'monospace'],
            },
            colors: {
                ivory: '#FFFDF8',
                plum: '#29243A',
                violet: '#7965D8',
                sage: '#B9D5BE',
                peach: '#FFCCB8',
                butter: '#F8E7A1',
            },
        },
    },
    plugins: [],
}
