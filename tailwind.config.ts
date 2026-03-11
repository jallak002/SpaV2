import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
	darkMode: ['class'],
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				gold: {
					DEFAULT: '#C9A84C',
					dark: '#8B6914',
					light: '#F0D060',
				},
				dark: {
					DEFAULT: '#0A0A0A',
					surface: '#111111',
					card: '#1A1A1A',
					hover: '#222222',
				},
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				serif: ['Cormorant Garamond', 'serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			animation: {
				'shimmer': 'shimmer 2s infinite',
				'fade-in-up': 'fadeInUp 0.4s ease forwards',
			},
		},
	},
	plugins: [tailwindcssAnimate],
}

export default config
