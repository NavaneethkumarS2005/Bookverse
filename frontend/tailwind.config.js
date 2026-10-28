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
                outfit: ['Cormorant Garamond', 'Georgia', 'serif'],
                inter: ['Commissioner', 'sans-serif'],
                serif: ['Cormorant Garamond', 'Georgia', 'serif'],
                sans: ['Commissioner', 'sans-serif'],
                mono: ['DM Mono', 'monospace'],
            },
            colors: {
                ivory: '#fffdf8',
                plum: '#171713',
                violet: '#7d2428',
                sage: '#78806a',
                peach: '#cec5b7',
                butter: '#e8e1d4',
                paper: '#f4efe5',
                ink: '#171713',
                accent: '#7d2428',
                muted: '#68675f',
                hairline: '#e8e1d4',
            },
        },
    },
    plugins: [],
}
