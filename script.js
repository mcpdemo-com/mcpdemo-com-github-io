tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'navy': '#080d1a',
                        'navy-secondary': '#0d1528',
                        'navy-card': '#111c35',
                        'cyan-primary': '#00d4ff',
                        'blue-secondary': '#4a9eff',
                        'text-primary': '#e8edf5',
                        'text-muted': '#8899aa',
                        'text-dim': '#556070',
                        'border-dark': '#1a2a40'
                    },
                    fontFamily: {
                        'heading': ['Exo 2', 'sans-serif'],
                        'body': ['IBM Plex Sans', 'sans-serif']
                    },
                    animation: {
                        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                        'float': 'float 6s ease-in-out infinite',
                        'grid-pulse': 'grid-pulse 8s ease-in-out infinite'
                    },
                    keyframes: {
                        'pulse-glow': {
                            '0%, 100%': { opacity: '0.7', filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.3))' },
                            '50%': { opacity: '1', filter: 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.5))' }
                        },
                        'float': {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-15px)' }
                        },
                        'grid-pulse': {
                            '0%, 100%': { opacity: '0.03' },
                            '50%': { opacity: '0.08' }
                        }
                    }
                }
            }
        }