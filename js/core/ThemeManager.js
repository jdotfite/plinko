/**
 * Theme Manager - handles theme switching and persistence
 */

class ThemeManager {
    constructor() {
        this.loadTheme();
        this.createToggleButton();
    }
    
    loadTheme() {
        // Load saved theme from localStorage
        const saved = localStorage.getItem('plinkoTheme');
        THEME_STATE.current = saved || 'light';
        this.applyTheme();
    }
    
    toggleTheme() {
        console.log('Toggle theme clicked!');
        const current = THEME_STATE.current;
        console.log('Current theme:', current, 'Type:', typeof current);
        console.log('Is light?', current === 'light');
        
        const newTheme = current === 'light' ? 'dark' : 'light';
        console.log('Calculated new theme:', newTheme);
        
        THEME_STATE.current = newTheme;
        console.log('After assignment, THEME_STATE.current:', THEME_STATE.current);
        
        localStorage.setItem('plinkoTheme', newTheme);
        this.applyTheme();
        this.updateButtonIcon();
        
        // Force full redraw of static elements
        if (window.game && window.game.renderer) {
            console.log('Setting staticDirty to true');
            window.game.renderer.staticDirty = true;
        } else {
            console.log('No game or renderer found');
        }
    }
    
    applyTheme() {
        // Update body background
        document.body.style.backgroundColor = CONFIG.COLORS.background;
        document.getElementById('game-container').style.backgroundColor = CONFIG.COLORS.background;
    }
    
    createToggleButton() {
        console.log('Creating theme toggle button');
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 25px;
            border: none;
            background: rgba(128, 128, 128, 0.2);
            backdrop-filter: blur(10px);
            cursor: pointer;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: background 0.3s ease;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
        `;
        
        button.addEventListener('click', () => {
            console.log('Button clicked!');
            this.toggleTheme();
        });
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(128, 128, 128, 0.3)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(128, 128, 128, 0.2)';
        });
        
        document.body.appendChild(button);
        this.button = button;
        console.log('Button appended to body');
        this.updateButtonIcon();
    }
    
    updateButtonIcon() {
        if (this.button) {
            this.button.textContent = THEME_STATE.current === 'light' ? '🌙' : '☀️';
        }
    }
}
