/**
 * Plinko Game - Entry Point
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    
    // Initialize theme manager
    window.themeManager = new ThemeManager();
    
    // Create and start game
    window.game = new Game(canvas);
    window.game.start();
    
    console.log('🎮 Plinko Game Started!');
    console.log('Touch or click above the board to drop a ball.');
});
