/**
 * Layout presets
 */

const LAYOUTS = {
    classic: new Layout(),
    dense: new Layout({
        pegs: {
            rows: 13,
            horizontalGap: 120,
            verticalGap: 110,
            pegsPerRowOdd: 7,
            pegsPerRowEven: 6
        }
    }),
    sparse: new Layout({
        pegs: {
            rows: 9,
            horizontalGap: 170,
            verticalGap: 160,
            pegsPerRowOdd: 5,
            pegsPerRowEven: 4
        }
    })
};

const LEVELS = [
    { id: 'classic', name: 'Level 1', mouthSpeed: 0.9, pegBonus: 0, powerPegCount: 2, powerPegEffect: 'multiball' },
    { id: 'dense', name: 'Level 2', mouthSpeed: 1.05, pegBonus: 4, powerPegCount: 3, powerPegEffect: 'slowmo' },
    { id: 'sparse', name: 'Level 3', mouthSpeed: 1.15, pegBonus: 8, powerPegCount: 2, powerPegEffect: 'bonus' }
];

window.LAYOUTS = LAYOUTS;
window.LEVELS = LEVELS;
