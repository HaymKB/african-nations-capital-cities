// ---------------------------------------------------------------------------
// African Safari Odyssey — Phaser 4 shell.
// The React DOM renders ALL primary UI (menus, HUD, quiz cards, map, drawer,
// notebook, flashcards, modals). This scene owns only the ambient safari
// backdrop (gradient savanna, sun, parallax hills, acacia silhouettes,
// fireflies, compass watermark), the arcade-physics dust particles, and the
// Phaser sound manager. Game state (questions, score, timer, power-ups) is
// driven from App.tsx through the shared EventBus.
// ---------------------------------------------------------------------------
import { AUTO, Events, Game as PhaserGame, Scale, Scene } from 'phaser';

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;

// ---------------------------------------------------------------------------
// EVENT BUS — shared React <-> Phaser bridge (named export).
// Event name constants live here so both sides can never drift.
// ---------------------------------------------------------------------------
export const EventBus = new Events.EventEmitter();

export const EV = {
    PHASE_CHANGED: 'phase-changed',
    CURRENT_SCENE_READY: 'current-scene-ready',
    START_GAME_MODE: 'start-game-mode',
    SCORE_UPDATED: 'score-updated',
    QUESTION_PRESENTED: 'question-presented',
    SELECT_OPTION: 'select-option',
    QUESTION_ANSWERED: 'question-answered',
    USE_POWERUP: 'use-powerup',
    POWERUP_TRIGGERED: 'powerup-triggered',
    MAP_COUNTRY_CLICKED: 'map-country-clicked',
    GAME_COMPLETED: 'game-completed',
    RESTART_GAME: 'restart-game',
    RETURN_TO_MENU: 'return-to-menu',
    TOGGLE_PAUSE: 'toggle-pause',
    PROCEED_NEXT: 'proceed-next',
    TOGGLE_MUTE: 'toggle-mute',
    COUNTDOWN_TICK: 'countdown-tick',
    TIMER_TICK: 'timer-tick',
    HIGHLIGHT_REGION: 'highlight-region',
} as const;

export class Game extends Scene {
    private bgGraphics!: Phaser.GameObjects.Graphics;
    private compassSprite!: Phaser.GameObjects.Image;
    private sunGlow!: Phaser.GameObjects.Image;
    private dust!: Phaser.GameObjects.Particles.ParticleEmitter | null;
    private muted = false;

    constructor() { super('Game'); }

    preload() {
        this.load.audio('sfx_button', 'assets/audio/sfx_button.mp3');
        this.load.audio('sfx_collect', 'assets/audio/sfx_collect.mp3');
        this.load.audio('sfx_hit', 'assets/audio/sfx_hit.mp3');
        this.load.audio('sfx_win', 'assets/audio/sfx_win.mp3');
        this.load.audio('sfx_gameover', 'assets/audio/sfx_gameover.mp3');
        this.load.audio('sfx_powerup', 'assets/audio/sfx_powerup.mp3');
        this.load.audio('bgm_chill', 'assets/audio/bgm_chill.mp3');
        this.load.image('fx_star', 'assets/fx/star.png');
        this.load.image('fx_spark', 'assets/fx/spark.png');
        this.load.image('fx_glow', 'assets/fx/glow.png');
    }

    create() {
        this.createTextures();

        // --- Ambient safari backdrop -------------------------------------
        this.bgGraphics = this.add.graphics().setDepth(0);
        this.drawBackground();

        this.sunGlow = this.add.image(GAME_WIDTH * 0.72, 150, 'fx_glow')
            .setScale(3.2).setTint(0xfbbf24).setAlpha(0.55).setDepth(1);
        this.tweens.add({ targets: this.sunGlow, alpha: 0.35, scale: 3.5, duration: 3200, yoyo: true, repeat: -1 });

        this.compassSprite = this.add.image(GAME_WIDTH / 2, 300, 'safari_compass')
            .setScale(1.6).setAlpha(0.1).setDepth(1);
        this.tweens.add({ targets: this.compassSprite, angle: 360, duration: 90000, repeat: -1 });

        // Acacia silhouettes along the horizon (organic, not prison bars).
        for (let i = 0; i < 5; i++) {
            this.add.image(40 + i * 112, GAME_HEIGHT - 118, 'acacia_tree')
                .setScale(0.5 + (i % 3) * 0.14).setAlpha(0.35).setDepth(2);
        }

        // --- Arcade physics dust motes (drift with zero gravity) ----------
        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.dust = this.add.particles(0, 0, 'fx_spark', {
            x: { min: 0, max: GAME_WIDTH },
            y: { min: GAME_HEIGHT * 0.4, max: GAME_HEIGHT },
            speedY: { min: -22, max: -6 },
            speedX: { min: -8, max: 8 },
            scale: { min: 0.25, max: 0.7 },
            alpha: { start: 0.55, end: 0 },
            lifespan: 5200,
            frequency: 260,
            tint: [0xf59e0b, 0xd4a574, 0xfbbf24],
        }).setDepth(3);
        void this.dust;

        // --- Keyboard (canvas-level shortcuts mirror React handlers) ------
        this.input.keyboard!.on('keydown-ESC', () => EventBus.emit(EV.TOGGLE_PAUSE));
        this.input.keyboard!.on('keydown-M', () => this.toggleMute());
        EventBus.on(EV.TOGGLE_MUTE, this.toggleMute, this);

        // Celebratory bursts when React reports a correct answer.
        EventBus.on(EV.QUESTION_ANSWERED, this.onAnswered, this);
        EventBus.on(EV.GAME_COMPLETED, this.onCompleted, this);

        this.sound.play('bgm_chill', { volume: 0.25, loop: true });

        this.events.once('shutdown', () => {
            this.time.removeAllEvents();
            this.tweens.killAll();
            this.input.keyboard?.removeAllListeners();
            this.sound.stopAll();
            EventBus.removeListener(EV.TOGGLE_MUTE, this.toggleMute, this);
            EventBus.removeListener(EV.QUESTION_ANSWERED, this.onAnswered, this);
            EventBus.removeListener(EV.GAME_COMPLETED, this.onCompleted, this);
        });

        EventBus.emit(EV.CURRENT_SCENE_READY, this);
        EventBus.emit(EV.PHASE_CHANGED, 'MENU');
    }

    update() {
        // Ambient scene: particles + tweens run themselves. No per-frame logic.
    }

    // ------------------------------------------------------------------ FX
    private onAnswered(res: { isCorrect?: boolean }) {
        if (!res || !res.isCorrect) return;
        this.sound.play('sfx_collect', { volume: 0.5 });
        const p = this.add.particles(0, 0, 'fx_star', {
            speed: { min: 60, max: 190 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, lifespan: 900,
            tint: [0xf59e0b, 0x22c55e, 0xfbbf24], quantity: 26, emitting: false,
        }).setDepth(20);
        p.explode(GAME_WIDTH / 2, GAME_HEIGHT * 0.42);
        this.time.delayedCall(950, () => p.destroy());
    }

    private onCompleted(summary: { correctCount?: number; totalCount?: number }) {
        const perfect = summary && summary.totalCount
            && summary.correctCount === summary.totalCount;
        this.sound.play(perfect ? 'sfx_win' : 'sfx_gameover', { volume: 0.7 });
    }

    private toggleMute() {
        this.muted = !this.muted;
        this.sound.mute = this.muted;
    }

    // ------------------------------------------------------- procedural art
    private createTextures() {
        // Safari compass watermark.
        const g = this.add.graphics();
        g.fillStyle(0xf59e0b, 0.9); g.lineStyle(2, 0xd97706, 1);
        g.fillCircle(64, 64, 60); g.strokeCircle(64, 64, 60);
        g.fillStyle(0xdc2626, 1);
        g.beginPath(); g.moveTo(64, 10); g.lineTo(74, 54); g.lineTo(54, 54); g.closePath(); g.fillPath();
        g.fillStyle(0xffffff, 1);
        g.beginPath(); g.moveTo(64, 118); g.lineTo(74, 74); g.lineTo(54, 74); g.closePath(); g.fillPath();
        g.fillStyle(0xfbbf24, 1); g.fillCircle(64, 64, 6);
        g.generateTexture('safari_compass', 128, 128); g.clear();

        // Acacia silhouette (organic umbrella canopy, not trunk+circle).
        g.fillStyle(0x120a04, 1);
        g.fillRect(94, 88, 12, 52);
        g.fillTriangle(100, 96, 60, 74, 66, 82);
        g.fillTriangle(100, 96, 140, 74, 134, 82);
        g.fillEllipse(100, 62, 130, 34);
        g.fillEllipse(74, 72, 90, 24);
        g.fillEllipse(126, 72, 90, 24);
        g.generateTexture('acacia_tree', 200, 140); g.destroy();
    }

    private drawBackground() {
        const g = this.bgGraphics;
        g.clear();
        // Sunset gradient bands.
        const stops = [0x2b1608, 0x451a03, 0x78350f, 0xb45309, 0xf59e0b];
        const bandH = Math.ceil(GAME_HEIGHT / stops.length);
        stops.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(0, i * bandH, GAME_WIDTH, bandH + 1); });
        // Layered parallax hill silhouettes.
        g.fillStyle(0x4a2c12, 1);
        g.fillEllipse(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.78, GAME_WIDTH * 1.2, 220);
        g.fillStyle(0x38200c, 1);
        g.fillEllipse(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.84, GAME_WIDTH * 1.1, 200);
        // Ground.
        g.fillStyle(0x1e130b, 1);
        g.fillRect(0, GAME_HEIGHT - 130, GAME_WIDTH, 130);
    }
}

// ---------------------------------------------------------------------------
// START GAME FACTORY
// ---------------------------------------------------------------------------
const StartGame = (parent: string) => {
    const config: Phaser.Types.Core.GameConfig = {
        type: AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent,
        backgroundColor: '#1e130b',
        scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [Game],
    };
    const game = new PhaserGame(config);
    if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;
        (window as unknown as Record<string, unknown>).__PHASER_EVENT_BUS__ = EventBus;
    }
    return game;
};

export default StartGame;
