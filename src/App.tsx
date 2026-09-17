// =============================================================================
// African Safari Odyssey — React shell.
// All primary UI lives here as DOM overlays above the Phaser canvas:
//  * MENU with 5 game modes, language switcher (RTL for Arabic), Safari
//    Notebook, 3D flashcards, Filter modal, Challenge link generator,
//    Daily leaderboard.
//  * COUNTDOWN, PLAYING (question HUD + power-ups + interactive SVG map),
//    PAUSED, FINISHED, LEADERBOARD phases.
// Phaser (src/game/main.ts) renders the ambient safari backdrop and owns
// audio; the quiz state machine lives in this component and talks to the
// scene through the EventBus.
// =============================================================================
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import StartGame, { EventBus, EV } from './game/main';
import {
    COUNTRIES, REGIONS, ISLAND_NATIONS, ALL_REGIONS, ALL_TYPES,
    type Region, type QuestionType, type GameMode, type Country, type FlagSpec,
    type FilterConfig, type ChallengeConfig, type GeneratedQuestion,
    buildQuestions, getCountryById, shuffle,
    loadFilters, saveFilters, loadNotebook, recordNotebook, type Notebook,
    loadMastered, toggleMastered, loadDailyBoard, submitDailyScore,
    loadDailyStreak, bumpDailyStreak, dailyKey, type DailyEntry, type StreakState,
    loadHighScores, saveHighScore, type HighScore,
    encodeChallenge, getChallengeFromURL, buildChallengeURL, speak,
} from './game/data';
import {
    type Lang, LANGUAGES, loadLang, saveLang, isRTL, t,
    regionLabel, typeLabel, LOCALE_TAG,
} from './game/i18n';
import { AfricaMap } from './game/AfricaMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'BOOT' | 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'LEADERBOARD';
type MenuTab = 'modes' | 'notebook' | 'flashcards' | 'leaderboard';
type PowerUp = 'fiftyFifty' | 'timeFreeze' | 'compass' | 'skip';

interface ScoreData { score: number; streak: number; multiplier: number; lives: number; timeLeft: number; timeMax: number; }
interface AnswerResult { isCorrect: boolean; selectedIndex: number; correctIndex: number; earnedPoints: number; fact: string; }
interface FinalSummary { finalScore: number; correctCount: number; totalCount: number; maxStreak: number; rankTitle: string; mode: GameMode; }
interface Toast { id: number; text: string; kind: 'info' | 'success' | 'error' | 'power'; }

const MODE_TIME: Record<GameMode, number> = { full: 20, sprint: 10, survival: 8, landmark: 15, daily: 15 };
const MODE_LABELS: Record<GameMode, { icon: string; en: string; desc: string }> = {
    full: { icon: '🧭', en: 'Full Safari Expedition', desc: 'All 54 nations, one epic journey' },
    sprint: { icon: '⚡', en: 'Speed Sprint', desc: '60-second blitz, combo multipliers' },
    survival: { icon: '❤️', en: 'Survival', desc: '3 lives, unforgiving timers' },
    landmark: { icon: '🏛️', en: 'Landmark & Flag Master', desc: 'Flags, wonders & heritage sites' },
    daily: { icon: '📅', en: 'Daily Challenge', desc: 'Same 10 questions for everyone today' },
};
const POWERUP_META: Record<PowerUp, { icon: string; en: string }> = {
    fiftyFifty: { icon: '🛡️', en: '50/50 Shield' },
    timeFreeze: { icon: '❄️', en: 'Time Freeze' },
    compass: { icon: '🧭', en: 'Safari Compass' },
    skip: { icon: '🍃', en: 'Skip Safari' },
};

function rankTitle(pct: number): string {
    if (pct >= 95) return 'Grand African Cartographer';
    if (pct >= 80) return 'Safari Master';
    if (pct >= 60) return 'Continent Navigator';
    if (pct >= 35) return 'Savannah Scout';
    return 'Safari Novice';
}

// ---------------------------------------------------------------------------
// Flag renderer (SVG from FlagSpec)
// ---------------------------------------------------------------------------
function Flag({ spec, className }: { spec: FlagSpec; className?: string }) {
    const W = 60, H = 40;
    const n = spec.bands.length || 1;
    const rects = spec.bands.map((c, i) => {
        const band = H / n;
        return spec.dir === 'h'
            ? <rect key={i} x={0} y={i * band} width={W} height={band + 0.5} fill={c} />
            : <rect key={i} x={i * (W / n)} y={0} width={W / n + 0.5} height={H} fill={c} />;
    });
    const cx = W / 2, cy = H / 2;
    let emblem: ReactElement | null = null;
    const ec = spec.emblemColor || '#ffffff';
    if (spec.emblem === 'star') emblem = <text x={cx} y={cy + 6} fontSize={18} fill={ec} textAnchor="middle">★</text>;
    else if (spec.emblem === 'crescent') emblem = (<g><circle cx={cx} cy={cy} r={9} fill={ec} /><circle cx={cx + 4} cy={cy} r={7.5} fill={spec.bands[0] || '#fff'} /></g>);
    else if (spec.emblem === 'circle') emblem = <circle cx={cx} cy={cy} r={8} fill="none" stroke={ec} strokeWidth={2.5} />;
    else if (spec.emblem === 'triangle') emblem = <polygon points={`${W * 0.18},${cy} ${W * 0.45},${cy - 9} ${W * 0.45},${cy + 9}`} fill={ec} />;
    else if (spec.emblem === 'shield') emblem = (<g><ellipse cx={cx} cy={cy} rx={10} ry={13} fill="#111" /><rect x={cx - 2} y={cy - 11} width={4} height={22} fill={ec} /></g>);
    else if (spec.emblem === 'bird') emblem = <text x={cx} y={cy + 6} fontSize={15} fill={ec} textAnchor="middle">🦅</text>;
    else if (spec.emblem === 'snow') emblem = <text x={cx} y={cy + 6} fontSize={14} fill={ec} textAnchor="middle">❄</text>;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className={className || 'flag-svg'} role="img" aria-label="flag">
            <g>{rects}</g>
            {spec.canton && <rect x={0} y={0} width={W / 3} height={H / 2.6} fill={spec.canton} />}
            {emblem}
            <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="rgba(0,0,0,.35)" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
    // --- Phaser bridge (NEVER remove: canvas mounts into #game-container) ---
    const gameRef = useRef<Phaser.Game | null>(null);
    useEffect(() => {
        if (!gameRef.current) {
            gameRef.current = StartGame('game-container');
        }
        const g = gameRef.current;
        return () => { g.destroy(true); gameRef.current = null; };
    }, []);

    // --- Core state machine ---
    const [phase, setPhase] = useState<Phase>('BOOT');
    const [menuTab, setMenuTab] = useState<MenuTab>('modes');
    const [mode, setMode] = useState<GameMode>('full');
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [qIndex, setQIndex] = useState(0);
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
    const [scoreData, setScoreData] = useState<ScoreData>({ score: 0, streak: 0, multiplier: 1, lives: 3, timeLeft: 20, timeMax: 20 });
    const [countdown, setCountdown] = useState(3);
    const [finalSummary, setFinalSummary] = useState<FinalSummary | null>(null);
    const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
    const [powerups, setPowerups] = useState<Record<PowerUp, number>>({ fiftyFifty: 2, timeFreeze: 2, compass: 2, skip: 2 });
    const [highlightRegion, setHighlightRegion] = useState<Region | null>(null);
    const [drawerCountry, setDrawerCountry] = useState<Country | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [locatorArmed, setLocatorArmed] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [muted, setMuted] = useState(false);

    // --- Persistence-backed UI state ---
    const [lang, setLang] = useState<Lang>(() => loadLang());
    const [filters, setFilters] = useState<FilterConfig>(() => loadFilters());
    const [showFilters, setShowFilters] = useState(false);
    const [showChallenge, setShowChallenge] = useState(false);
    const [challengeCfg, setChallengeCfg] = useState<ChallengeConfig | null>(null);
    const [notebook, setNotebook] = useState<Notebook>(() => loadNotebook());
    const [mastered, setMastered] = useState<number[]>(() => loadMastered());
    const [dailyBoard, setDailyBoard] = useState<DailyEntry[]>([]);
    const [streak, setStreak] = useState<StreakState>(() => loadDailyStreak());
    const [highScores, setHighScores] = useState<HighScore[]>(() => loadHighScores());
    const [flipCard, setFlipCard] = useState<number>(1);
    const [flashFlipped, setFlashFlipped] = useState(false);

    const rtl = isRTL(lang);
    const tr = useCallback((key: string) => t(lang, key), [lang]);

    const pushToast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(ts => [...ts.slice(-2), { id, text, kind }]);
        window.setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2600);
    }, []);

    // Parse incoming Base64 challenge URL on BOOT.
    useEffect(() => {
        const cfg = getChallengeFromURL();
        if (cfg) {
            setChallengeCfg(cfg);
            pushToast('Challenge link loaded! 🦁', 'success');
        }
    }, [pushToast]);

    // Sync direction + lang attributes for RTL support.
    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    }, [lang, rtl]);

    // --- Phaser -> React listeners ---
    useEffect(() => {
        const onPhase = (p: Phase) => setPhase(p);
        EventBus.on(EV.PHASE_CHANGED, onPhase);
        return () => { EventBus.removeListener(EV.PHASE_CHANGED, onPhase); };
    }, []);

    // --- Engine refs so the interval closure always sees fresh state ---
    const engineRef = useRef({ questions: [] as GeneratedQuestion[], qIndex: 0, mode: 'full' as GameMode, sprintEnd: 0, frozenUntil: 0 });
    engineRef.current.questions = questions;
    engineRef.current.qIndex = qIndex;
    engineRef.current.mode = mode;

    const finishGame = useCallback((correct: number, total: number, score: number, maxStreak: number, m: GameMode) => {
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const summary: FinalSummary = { finalScore: score, correctCount: correct, totalCount: total, maxStreak, rankTitle: rankTitle(pct), mode: m };
        setFinalSummary(summary);
        setHighScores(saveHighScore(m, score));
        if (m === 'daily') {
            const day = dailyKey();
            setDailyBoard(submitDailyScore(day, score));
            setStreak(bumpDailyStreak(day));
        }
        EventBus.emit(EV.GAME_COMPLETED, summary);
        setPhase('FINISHED');
    }, []);

    const finishRef = useRef(finishGame);
    finishRef.current = finishGame;
    const statsRef = useRef({ correct: 0, maxStreak: 0 });

    // --- Per-second timer loop (PLAYING only) ---
    useEffect(() => {
        if (phase !== 'PLAYING') return;
        const id = window.setInterval(() => {
            setScoreData(prev => {
                const now = Date.now();
                if (now < engineRef.current.frozenUntil) return prev; // Time Freeze active
                const tLeft = prev.timeLeft - 1;
                if (engineRef.current.mode === 'sprint' && now >= engineRef.current.sprintEnd) {
                    window.clearInterval(id);
                    window.setTimeout(() => finishRef.current(statsRef.current.correct, Math.max(1, engineRef.current.qIndex), prev.score, statsRef.current.maxStreak, 'sprint'), 0);
                    return prev;
                }
                if (tLeft <= 0) {
                    window.setTimeout(() => handleTimeout(), 0);
                    return { ...prev, timeLeft: 0 };
                }
                return { ...prev, timeLeft: tLeft };
            });
        }, 1000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    const answerBox = useRef<AnswerResult | null>(null);
    useEffect(() => { answerBox.current = answerResult; }, [answerResult]);

    const currentQ = questions[qIndex] || null;

    // --- Question flow ---
    const presentQuestion = useCallback((qs: GeneratedQuestion[], idx: number) => {
        const q = qs[idx];
        if (!q) return;
        setAnswerResult(null);
        setDisabledOptions([]);
        setHighlightRegion(null);
        setLocatorArmed(q.type === 'locator');
        setShowMap(q.type === 'locator');
        const time = MODE_TIME[engineRef.current.mode] ?? 15;
        setScoreData(s => ({ ...s, timeLeft: time, timeMax: time }));
        EventBus.emit(EV.QUESTION_PRESENTED, { ...q, questionIndex: idx + 1, totalQuestions: qs.length, timeLimit: time });
    }, []);

    const advance = useCallback(() => {
        const { questions: qs, mode: m } = engineRef.current;
        const next = engineRef.current.qIndex + 1;
        if (next >= qs.length) {
            finishRef.current(statsRef.current.correct, qs.length, scoreRef.current.score, statsRef.current.maxStreak, m);
            return;
        }
        setQIndex(next);
        engineRef.current.qIndex = next;
        presentQuestion(qs, next);
    }, [presentQuestion]);

    const scoreRef = useRef(scoreData);
    scoreRef.current = scoreData;

    const evaluate = useCallback((selected: number) => {
        const q = engineRef.current.questions[engineRef.current.qIndex];
        if (!q || answerBox.current) return;
        const isCorrect = selected === q.answerIndex;
        let points = 0;
        setScoreData(prev => {
            let { score, streak, multiplier, lives } = prev;
            if (isCorrect) {
                streak += 1;
                if (streak > statsRef.current.maxStreak) statsRef.current.maxStreak = streak;
                multiplier = Math.min(4, 1 + Math.floor(streak / 2) * 0.5);
                points = Math.round((100 + prev.timeLeft * 5) * multiplier);
                score += points;
                statsRef.current.correct += 1;
            } else {
                streak = 0; multiplier = 1;
                if (engineRef.current.mode === 'survival') lives = Math.max(0, lives - 1);
            }
            return { ...prev, score, streak, multiplier, lives };
        });
        const result: AnswerResult = { isCorrect, selectedIndex: selected, correctIndex: q.answerIndex, earnedPoints: points, fact: q.fact };
        setAnswerResult(result);
        answerBox.current = result;
        recordNotebook(q.countryId, isCorrect);
        setNotebook(loadNotebook());
        EventBus.emit(EV.QUESTION_ANSWERED, result);
        if (!isCorrect && engineRef.current.mode === 'survival') {
            const livesLeft = scoreRef.current.lives - 1;
            if (livesLeft <= 0) {
                window.setTimeout(() => finishRef.current(statsRef.current.correct, engineRef.current.questions.length, scoreRef.current.score, statsRef.current.maxStreak, 'survival'), 1200);
            }
        }
    }, []);

    const handleTimeout = useCallback(() => {
        if (answerBox.current) return;
        evaluate(-1);
    }, [evaluate]);

    const selectOption = useCallback((index: number) => {
        if (answerBox.current || disabledOptions.includes(index)) return;
        evaluate(index);
    }, [evaluate, disabledOptions]);

    // React -> scene commands also mirrored on EventBus for Phaser listeners.
    useEffect(() => {
        const onSelect = (d: { index: number }) => selectOption(d.index);
        const onPower = (d: { powerUp: PowerUp }) => usePowerUp(d.powerUp);
        EventBus.on(EV.SELECT_OPTION, onSelect);
        EventBus.on(EV.USE_POWERUP, onPower);
        return () => {
            EventBus.removeListener(EV.SELECT_OPTION, onSelect);
            EventBus.removeListener(EV.USE_POWERUP, onPower);
        };
    });

    // --- Power-ups ---
    const usePowerUp = useCallback((p: PowerUp) => {
        const q = engineRef.current.questions[engineRef.current.qIndex];
        if (!q || answerBox.current) return;
        if (powerups[p] <= 0) { pushToast('Power-up depleted!', 'error'); return; }
        setPowerups(prev => ({ ...prev, [p]: prev[p] - 1 }));
        EventBus.emit(EV.POWERUP_TRIGGERED, { powerUp: p, message: POWERUP_META[p].en });
        if (p === 'fiftyFifty' && q.options.length >= 4) {
            const wrong = q.options.map((_, i) => i).filter(i => i !== q.answerIndex);
            setDisabledOptions(shuffle(wrong).slice(0, 2));
            pushToast('🛡️ 50/50 Shield — two wrong answers removed!', 'power');
        } else if (p === 'timeFreeze') {
            engineRef.current.frozenUntil = Date.now() + 10000;
            setScoreData(s => ({ ...s, timeLeft: Math.min(s.timeMax, s.timeLeft + 15) }));
            pushToast('❄️ Time Freeze — +15s and timer paused 10s!', 'power');
        } else if (p === 'compass') {
            setHighlightRegion(getCountryById(q.countryId)?.region ?? null);
            EventBus.emit(EV.HIGHLIGHT_REGION, { region: getCountryById(q.countryId)?.region });
            setShowMap(true);
            pushToast(`🧭 Safari Compass — look at ${getCountryById(q.countryId) ? regionLabel(lang, getCountryById(q.countryId)!.region) : 'the map'}!`, 'power');
        } else if (p === 'skip') {
            pushToast('🍃 Skipped — no penalty.', 'power');
            window.setTimeout(() => advance(), 300);
        }
    }, [powerups, lang, pushToast, advance]);

    // --- Locator answers via map tap ---
    const onLocatorTap = useCallback((c: Country | null) => {
        if (!locatorArmed || answerBox.current) return;
        const q = engineRef.current.questions[engineRef.current.qIndex];
        if (!q) return;
        EventBus.emit(EV.MAP_COUNTRY_CLICKED, { countryId: c?.id ?? 0, countryName: c?.country ?? '' });
        evaluate(c && c.id === q.countryId ? q.answerIndex : -1);
        setLocatorArmed(false);
    }, [locatorArmed, evaluate]);

    // --- Start / restart / menu ---
    const startGame = useCallback((m: GameMode, f?: FilterConfig, challenge?: ChallengeConfig | null) => {
        setMode(m);
        engineRef.current.mode = m;
        engineRef.current.frozenUntil = 0;
        statsRef.current = { correct: 0, maxStreak: 0 };
        const activeFilters = challenge?.filters || f || filters;
        const qs = challenge?.filters || m !== 'daily'
            ? buildQuestions(m, activeFilters)
            : buildQuestions('daily', activeFilters);
        setQuestions(qs);
        engineRef.current.questions = qs;
        setQIndex(0); engineRef.current.qIndex = 0;
        setPowerups({ fiftyFifty: 2, timeFreeze: 2, compass: 2, skip: 2 });
        setScoreData({ score: 0, streak: 0, multiplier: 1, lives: 3, timeLeft: MODE_TIME[m], timeMax: MODE_TIME[m] });
        if (m === 'sprint') engineRef.current.sprintEnd = Date.now() + 60000;
        setDrawerCountry(null); setShowMap(false);
        setPhase('COUNTDOWN');
        setCountdown(3);
        let c = 3;
        const tick = window.setInterval(() => {
            c -= 1;
            setCountdown(c);
            EventBus.emit(EV.COUNTDOWN_TICK, c);
            if (c <= 0) {
                window.clearInterval(tick);
                setPhase('PLAYING');
                presentQuestion(qs, 0);
            }
        }, 900);
    }, [filters, presentQuestion]);

    const restartGame = useCallback(() => { startGame(mode); }, [mode, startGame]);
    const returnToMenu = useCallback(() => {
        setPhase('MENU'); setMenuTab('modes'); setDrawerCountry(null); setShowMap(false);
        setFinalSummary(null); setShowFilters(false); setShowChallenge(false);
        EventBus.emit(EV.RETURN_TO_MENU, {});
    }, []);

    const togglePause = useCallback(() => {
        setPhase(p => {
            if (p === 'PLAYING') { EventBus.emit(EV.TOGGLE_PAUSE, {}); return 'PAUSED'; }
            if (p === 'PAUSED') { EventBus.emit(EV.TOGGLE_PAUSE, {}); return 'PLAYING'; }
            return p;
        });
    }, []);

    // --- Keyboard parity ---
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                if (phase === 'PLAYING' || phase === 'PAUSED') togglePause();
            }
            if ((e.key === ' ' || e.key === 'Enter') && phase === 'PLAYING' && answerResult) { e.preventDefault(); advance(); }
            if ((e.key === ' ' || e.key === 'Enter') && phase === 'FINISHED') restartGame();
            if (phase === 'PLAYING' && ['1', '2', '3', '4'].includes(e.key)) selectOption(parseInt(e.key, 10) - 1);
            if (e.key === 'm' || e.key === 'M') { setMuted(mu => { EventBus.emit(EV.TOGGLE_MUTE); return !mu; }); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, answerResult, advance, restartGame, selectOption, togglePause]);

    // --- Daily leaderboard refresh when opening the tab ---
    useEffect(() => {
        if (menuTab === 'leaderboard') { setDailyBoard(loadDailyBoard(dailyKey())); setStreak(loadDailyStreak()); }
    }, [menuTab]);

    // --- Challenge link actions ---
    const copyChallengeLink = useCallback(async (cfg: ChallengeConfig) => {
        const url = buildChallengeURL(cfg);
        try { await navigator.clipboard.writeText(url); pushToast('Challenge link copied! 📋', 'success'); }
        catch { pushToast('Copy failed — link shown in modal.', 'error'); }
    }, [pushToast]);

    const saveFilter = useCallback((f: FilterConfig) => { setFilters(f); saveFilters(f); setShowFilters(false); pushToast('Filters applied ✅', 'success'); }, [pushToast]);

    const trMode = (m: GameMode) => MODE_LABELS[m].en;

    const accuracy = useMemo(() => {
        const seen = Object.values(notebook);
        const total = seen.reduce((a, b) => a + b.seen, 0);
        const correct = seen.reduce((a, b) => a + b.correct, 0);
        return { explored: seen.length, total: 54, pct: total ? Math.round((correct / total) * 100) : 0 };
    }, [notebook]);

    const flashCountry = getCountryById(flipCard) || COUNTRIES[0];

    // =========================================================================
    // RENDER
    // =========================================================================
    const inGame = phase === 'PLAYING' || phase === 'PAUSED' || phase === 'COUNTDOWN';

    return (
        <div id="app" className={rtl ? 'rtl' : ''} dir={rtl ? 'rtl' : 'ltr'}>
            <div id="game-container" />
            <div id="hud">
                {/* ============================ MENU ============================ */}
                {phase === 'MENU' && (
                    <div className="overlay menu-overlay">
                        <div className="menu-card">
                            <div className="menu-top">
                                <h1 className="title-text">🌍 {tr('app.title')}</h1>
                                <p className="subtitle">{tr('app.subtitle')}</p>
                                <div className="lang-switch" role="group" aria-label="Language">
                                    {LANGUAGES.map(l => (
                                        <button key={l.code} className={lang === l.code ? 'active' : ''}
                                            onClick={() => { setLang(l.code); saveLang(l.code); }}>{l.native}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="tab-row">
                                <button className={menuTab === 'modes' ? 'active' : ''} onClick={() => setMenuTab('modes')}>{trMode('full').split(' ')[0]} · Modes</button>
                                <button className={menuTab === 'notebook' ? 'active' : ''} onClick={() => setMenuTab('notebook')}>📓 {tr('menu.notebook')}</button>
                                <button className={menuTab === 'flashcards' ? 'active' : ''} onClick={() => setMenuTab('flashcards')}>🃏 Flashcards</button>
                                <button className={menuTab === 'leaderboard' ? 'active' : ''} onClick={() => setMenuTab('leaderboard')}>🏆 {tr('menu.highscores')}</button>
                            </div>

                            {menuTab === 'modes' && (
                                <div className="tab-body">
                                    <div className="mode-buttons">
                                        {(Object.keys(MODE_LABELS) as GameMode[]).map((m, i) => (
                                            <button key={m} className={`mode-btn ${['primary', 'secondary', 'tertiary', 'quaternary', 'daily'][i]}`}
                                                onClick={() => startGame(m)}>
                                                <span className="mode-icon">{MODE_LABELS[m].icon}</span>
                                                <span className="mode-text"><strong>{trMode(m)}</strong><small>{MODE_LABELS[m].desc}</small></span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="menu-actions-row">
                                        <button className="chip-btn" onClick={() => setShowFilters(true)}>⚙️ {tr('menu.settings')}</button>
                                        <button className="chip-btn" onClick={() => setShowChallenge(true)}>🔗 {tr('menu.challenge')}</button>
                                        {challengeCfg && (
                                            <button className="chip-btn highlight" onClick={() => startGame(challengeCfg.mode, undefined, challengeCfg)}>
                                                ▶️ Play shared challenge
                                            </button>
                                        )}
                                    </div>
                                    <p className="instructions">{tr('app.subtitle')} · 1-4 keys · Space next · P pause · M mute</p>
                                </div>
                            )}

                            {menuTab === 'notebook' && (
                                <div className="tab-body notebook">
                                    <div className="notebook-stats">
                                        <div className="nb-stat"><strong>{accuracy.explored}/54</strong><span>nations explored</span></div>
                                        <div className="nb-stat"><strong>{accuracy.pct}%</strong><span>accuracy</span></div>
                                        <div className="nb-stat"><strong>{mastered.length}</strong><span>mastered</span></div>
                                        <div className="nb-stat"><strong>🔥 {streak.count}</strong><span>daily streak</span></div>
                                    </div>
                                    <div className="badge-row">
                                        {accuracy.explored >= 10 && <span className="badge">🥉 Explorer</span>}
                                        {accuracy.explored >= 25 && <span className="badge">🥈 Pathfinder</span>}
                                        {accuracy.explored >= 54 && <span className="badge">🥇 Grand Cartographer</span>}
                                        {streak.count >= 3 && <span className="badge">🔥 Streak x{streak.count}</span>}
                                    </div>
                                    <div className="country-grid">
                                        {COUNTRIES.map(c => {
                                            const e = notebook[c.id];
                                            return (
                                                <button key={c.id} className={`nb-cell ${e ? (e.correct / e.seen >= 0.6 ? 'good' : 'weak') : 'unseen'}`}
                                                    style={{ borderColor: REGIONS[c.region].css }}
                                                    onClick={() => { setDrawerCountry(c); setShowMap(false); }} title={`${c.country} — ${regionLabel(lang, c.region)}`}>
                                                    <Flag spec={c.flag} className="flag-mini" />
                                                    <span>{e ? '✓' : '·'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {menuTab === 'flashcards' && (
                                <div className="tab-body flashcards">
                                    <div className="fc-nav">
                                        <button onClick={() => { setFlipCard(i => (i <= 1 ? 54 : i - 1)); setFlashFlipped(false); }}>‹</button>
                                        <span>{flashCountry.country}</span>
                                        <button onClick={() => { setFlipCard(i => (i >= 54 ? 1 : i + 1)); setFlashFlipped(false); }}>›</button>
                                    </div>
                                    <div className={`flashcard ${flashFlipped ? 'flipped' : ''}`} onClick={() => { setFlashFlipped(f => !f); EventBus.emit(EV.POWERUP_TRIGGERED, { powerUp: 'card', message: 'flip' }); }}>
                                        <div className="fc-face fc-front">
                                            <Flag spec={flashCountry.flag} className="flag-big" />
                                            <h3>{flashCountry.country}</h3>
                                            <span className="region-pill" style={{ background: REGIONS[flashCountry.region].css }}>{regionLabel(lang, flashCountry.region)}</span>
                                            <p className="fc-hint">{tr('hud.flip')}</p>
                                        </div>
                                        <div className="fc-face fc-back">
                                            <h3>{flashCountry.capital}</h3>
                                            <p className="phonetic">/{flashCountry.phonetic}/ <button className="speak-btn" onClick={(e) => { e.stopPropagation(); speak(`${flashCountry.country}, ${flashCountry.capital}`, LOCALE_TAG[lang]); }}>🔊</button></p>
                                            <p>🏛️ {flashCountry.landmark}</p>
                                            <p className="fact">{flashCountry.fact}</p>
                                            <label className="mastered-toggle" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={mastered.includes(flashCountry.id)}
                                                    onChange={() => setMastered(toggleMastered(flashCountry.id))} />
                                                <span>{tr('hud.mastered')}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {menuTab === 'leaderboard' && (
                                <div className="tab-body leaderboard">
                                    <h3>📅 Daily Challenge · {dailyKey()}</h3>
                                    <div className="lb-list">
                                        {dailyBoard.map((e, i) => (
                                            <div key={i} className={`lb-row ${e.name === 'You' ? 'me' : ''}`}>
                                                <span className="lb-medal">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                                                <span className="lb-name">{e.name}</span>
                                                <span className="lb-score">{e.score}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <h3>🏆 All-time high scores</h3>
                                    <div className="lb-list">
                                        {highScores.length === 0 && <p className="muted">No expeditions yet — start one!</p>}
                                        {highScores.map((h, i) => (
                                            <div key={i} className="lb-row"><span className="lb-name">{h.mode} · {h.date}</span><span className="lb-score">{h.score}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================= COUNTDOWN ========================= */}
                {phase === 'COUNTDOWN' && (
                    <div className="overlay countdown-overlay">
                        <div className="countdown-number">{countdown > 0 ? countdown : 'GO!'}</div>
                        <p className="countdown-text">{trMode(mode)}</p>
                    </div>
                )}

                {/* =========================== PLAYING ========================== */}
                {(phase === 'PLAYING' || phase === 'PAUSED') && (
                    <div className="playing-layout">
                        {/* Top HUD */}
                        <div className="top-bar">
                            <div className="tb-left">
                                <span className="question-counter">{tr('hud.question')} {Math.min(qIndex + 1, questions.length)}/{questions.length}</span>
                                <span className="score-display">{tr('hud.score')}: {scoreData.score}</span>
                            </div>
                            <div className="tb-right">
                                {mode === 'survival' && <span className="lives-mini">{'❤️'.repeat(Math.max(0, scoreData.lives))}{'🖤'.repeat(3 - Math.max(0, scoreData.lives))}</span>}
                                <span className="streak-display">🔥 {scoreData.streak} · {scoreData.multiplier.toFixed(1)}x</span>
                                <button className="icon-btn" onClick={togglePause} aria-label="Pause">⏸</button>
                            </div>
                        </div>

                        {/* Timer gauge */}
                        <div className="timer-gauge">
                            <div className="timer-bar-fill" style={{ width: `${(scoreData.timeLeft / Math.max(1, scoreData.timeMax)) * 100}%`, background: scoreData.timeLeft / scoreData.timeMax < 0.3 ? 'linear-gradient(90deg,#dc2626,#f87171)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
                        </div>

                        {/* Question card */}
                        {currentQ && (
                            <div className="question-panel">
                                <div className="country-badge">
                                    {currentQ.type === 'flag' && currentQ.flag
                                        ? <Flag spec={currentQ.flag} className="flag-badge" />
                                        : <span className="flag-icon">🌍</span>}
                                    <span className="country-name">{currentQ.type === 'flag' || currentQ.type === 'landmark' || currentQ.type === 'locator' ? '???' : currentQ.country}</span>
                                </div>
                                <div className="question-text">{currentQ.prompt}</div>

                                {currentQ.type !== 'locator' ? (
                                    <div className="options-grid">
                                        {currentQ.options.map((opt, i) => {
                                            const cls = answerResult
                                                ? (i === answerResult.correctIndex ? 'correct' : i === answerResult.selectedIndex ? 'incorrect' : 'faded')
                                                : disabledOptions.includes(i) ? 'disabled' : '';
                                            const optCountry = COUNTRIES.find(c => c.country === opt);
                                            return (
                                                <button key={i} className={`option-card ${cls}`} disabled={!!answerResult || disabledOptions.includes(i)}
                                                    onClick={() => selectOption(i)}>
                                                    <span className="option-label">{['A', 'B', 'C', 'D'][i]}</span>
                                                    {currentQ.type === 'reverse' || currentQ.type === 'landmark' ? <span className="opt-flag">{optCountry ? '🏳️' : ''}</span> : null}
                                                    <span className="option-text">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="locator-panel">
                                        <AfricaMap lang={lang} highlightRegion={highlightRegion} pinCountryId={null}
                                            locatorMode onCountryClick={() => undefined} onLocatorTap={onLocatorTap} />
                                    </div>
                                )}

                                {/* Power-up bar */}
                                <div className="powerup-bar">
                                    {(Object.keys(POWERUP_META) as PowerUp[]).map(p => (
                                        <button key={p} className={`power-btn ${powerups[p] === 0 ? 'spent' : ''}`} disabled={powerups[p] === 0 || !!answerResult}
                                            onClick={() => usePowerUp(p)} title={POWERUP_META[p].en}>
                                            <span className="pu-icon">{POWERUP_META[p].icon}</span>
                                            <span className="pu-count">×{powerups[p]}</span>
                                        </button>
                                    ))}
                                    <button className="power-btn map-toggle" onClick={() => setShowMap(s => !s)} title="Africa map">🗺️</button>
                                </div>

                                {/* Fact banner */}
                                {answerResult && (
                                    <div className={`fact-banner ${answerResult.isCorrect ? 'fact-correct' : 'fact-incorrect'}`}>
                                        <div className="fact-icon">{answerResult.isCorrect ? '✅' : '❌'}</div>
                                        <div className="fact-content">
                                            <div className="fact-title">{answerResult.isCorrect ? tr('hud.correct') : tr('hud.incorrect')}</div>
                                            <div className="fact-detail">{answerResult.fact}</div>
                                            {answerResult.earnedPoints > 0 && <div className="fact-points">+{answerResult.earnedPoints}</div>}
                                        </div>
                                        <button className="next-btn" onClick={advance}>{tr('hud.next')} →</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Slide-over map */}
                        {showMap && currentQ?.type !== 'locator' && (
                            <div className="map-drawer">
                                <button className="drawer-close" onClick={() => setShowMap(false)}>✕</button>
                                <AfricaMap lang={lang} highlightRegion={highlightRegion} pinCountryId={currentQ?.countryId ?? null}
                                    locatorMode={false} onCountryClick={c => setDrawerCountry(c)} onLocatorTap={() => undefined} />
                            </div>
                        )}

                        {/* Pause overlay */}
                        {phase === 'PAUSED' && (
                            <div className="overlay paused-overlay">
                                <div className="pause-card">
                                    <h2>⏸️ {tr('menu.resume') ? 'Paused' : 'Paused'}</h2>
                                    <button className="action-btn primary" onClick={togglePause}>▶️ {tr('menu.resume')}</button>
                                    <button className="action-btn secondary" onClick={restartGame}>🔄 {tr('menu.restart')}</button>
                                    <button className="action-btn tertiary" onClick={returnToMenu}>🏠 {tr('menu.back')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================== FINISHED ========================== */}
                {phase === 'FINISHED' && finalSummary && (
                    <div className="overlay finished-overlay">
                        <div className="summary-card">
                            <h2>🏆 {tr('summary.finish')}</h2>
                            <div className="rank-display">{finalSummary.rankTitle}</div>
                            <div className="stats-grid">
                                <div className="stat-item"><div className="stat-value">{finalSummary.finalScore}</div><div className="stat-label">{tr('hud.score')}</div></div>
                                <div className="stat-item"><div className="stat-value">{finalSummary.totalCount ? Math.round((finalSummary.correctCount / finalSummary.totalCount) * 100) : 0}%</div><div className="stat-label">{tr('hud.accuracy')}</div></div>
                                <div className="stat-item"><div className="stat-value">{finalSummary.maxStreak}</div><div className="stat-label">{tr('hud.streak')}</div></div>
                                <div className="stat-item"><div className="stat-value">{finalSummary.correctCount}/{finalSummary.totalCount}</div><div className="stat-label">{tr('hud.correct')}</div></div>
                            </div>
                            <div className="summary-actions">
                                <button className="action-btn primary" onClick={restartGame}>🔄 {tr('menu.playAgain')}</button>
                                <button className="action-btn secondary" onClick={() => { copyChallengeLink({ mode: finalSummary.mode, filters, count: 10 }); }}>🔗 {tr('menu.challenge')}</button>
                                <button className="action-btn tertiary" onClick={returnToMenu}>🏠 {tr('menu.back')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===================== COUNTRY INFO DRAWER ==================== */}
                {drawerCountry && (
                    <div className="info-drawer open">
                        <button className="drawer-close" onClick={() => setDrawerCountry(null)}>✕</button>
                        <div className="drawer-body">
                            <Flag spec={drawerCountry.flag} className="flag-big" />
                            <h2>{drawerCountry.country}
                                <button className="speak-btn" onClick={() => speak(drawerCountry.country, LOCALE_TAG[lang])} aria-label="Pronounce country">🔊</button>
                            </h2>
                            <p className="phonetic">/{drawerCountry.phonetic}/</p>
                            <span className="region-pill" style={{ background: REGIONS[drawerCountry.region].css }}>{regionLabel(lang, drawerCountry.region)}</span>
                            <div className="drawer-rows">
                                <div><span>{tr('type.capital')}</span><strong>{drawerCountry.capital} <button className="speak-btn" onClick={() => speak(drawerCountry.capital, LOCALE_TAG[lang])}>🔊</button></strong></div>
                                <div><span>{tr('type.landmark')}</span><strong>{drawerCountry.landmark}</strong></div>
                                <div><span>Map</span><strong>{drawerCountry.x}, {drawerCountry.y}</strong></div>
                            </div>
                            <p className="fact">{drawerCountry.fact}</p>
                        </div>
                    </div>
                )}

                {/* ======================== FILTER MODAL ======================== */}
                {showFilters && (
                    <FilterModal lang={lang} initial={filters} onClose={() => setShowFilters(false)} onSave={saveFilter} />
                )}

                {/* ====================== CHALLENGE MODAL ======================= */}
                {showChallenge && (
                    <ChallengeModal lang={lang} filters={filters} onClose={() => setShowChallenge(false)}
                        onCreate={(cfg) => { copyChallengeLink(cfg); }} onPlay={(cfg) => { setShowChallenge(false); startGame(cfg.mode, undefined, cfg); }} />
                )}

                {/* ============================ TOASTS ========================== */}
                <div className="toast-stack">
                    {toasts.map(tt => <div key={tt.id} className={`toast toast-${tt.kind}`}>{tt.text}</div>)}
                </div>

                {/* BOOT fallback (canvas still mounting) */}
                {phase === 'BOOT' && !inGame && (
                    <div className="overlay"><div className="menu-card"><h1 className="title-text">🌍 {tr('app.title')}</h1><p className="subtitle">Loading safari…</p></div></div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Filter modal
// ---------------------------------------------------------------------------
function FilterModal({ lang, initial, onClose, onSave }: { lang: Lang; initial: FilterConfig; onClose: () => void; onSave: (f: FilterConfig) => void }) {
    const [regions, setRegions] = useState<Region[]>(initial.regions);
    const [types, setTypes] = useState<QuestionType[]>(initial.types);
    const [count, setCount] = useState<number>(initial.count);
    const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    return (
        <div className="overlay modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <h2>⚙️ {t(lang, 'setup.title')}</h2>
                <h3>{t(lang, 'setup.regions')}</h3>
                <div className="chip-grid">
                    {ALL_REGIONS.map(r => (
                        <button key={r} className={`toggle-chip ${regions.includes(r) ? 'on' : ''}`} style={{ borderColor: REGIONS[r].css }}
                            onClick={() => toggle(regions, r, setRegions)}>{regionLabel(lang, r)}</button>
                    ))}
                </div>
                <h3>{t(lang, 'setup.types')}</h3>
                <div className="chip-grid">
                    {ALL_TYPES.map(ty => (
                        <button key={ty} className={`toggle-chip ${types.includes(ty) ? 'on' : ''}`} onClick={() => toggle(types, ty, setTypes)}>{ty === 'locator' ? '🗺️ Map Locator' : typeLabel(lang, ty)}</button>
                    ))}
                </div>
                <h3>{t(lang, 'setup.count')}</h3>
                <div className="chip-grid">
                    {[5, 10, 15, 20, 0].map(n => (
                        <button key={n} className={`toggle-chip ${count === n ? 'on' : ''}`} onClick={() => setCount(n)}>{n === 0 ? t(lang, 'setup.countFull') : n}</button>
                    ))}
                </div>
                <div className="modal-actions">
                    <button className="action-btn secondary" onClick={onClose}>✕ {t(lang, 'menu.back')}</button>
                    <button className="action-btn primary" disabled={regions.length === 0 || types.length === 0}
                        onClick={() => onSave({ regions, types, count })}>✅ {t(lang, 'setup.start')}</button>
                </div>
                {(regions.length === 0 || types.length === 0) && <p className="validation">{t(lang, 'setup.validation')}</p>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Challenge link modal (Base64 encoded URL)
// ---------------------------------------------------------------------------
function ChallengeModal({ lang, filters, onClose, onCreate, onPlay }: {
    lang: Lang; filters: FilterConfig; onClose: () => void;
    onCreate: (cfg: ChallengeConfig) => void; onPlay: (cfg: ChallengeConfig) => void;
}) {
    const [mode, setMode] = useState<GameMode>('full');
    const [count, setCount] = useState(10);
    const [regions, setRegions] = useState<Region[]>(filters.regions);
    const cfg: ChallengeConfig = { mode, filters: { ...filters, regions, count }, count };
    const link = useMemo(() => buildChallengeURL(cfg), [cfg]);
    return (
        <div className="overlay modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <h2>🔗 {t(lang, 'menu.challenge')}</h2>
                <h3>Mode</h3>
                <div className="chip-grid">
                    {(Object.keys(MODE_LABELS) as GameMode[]).map(m => (
                        <button key={m} className={`toggle-chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{MODE_LABELS[m].icon} {MODE_LABELS[m].en}</button>
                    ))}
                </div>
                <h3>{t(lang, 'setup.regions')}</h3>
                <div className="chip-grid">
                    {ALL_REGIONS.map(r => (
                        <button key={r} className={`toggle-chip ${regions.includes(r) ? 'on' : ''}`} onClick={() => setRegions(regions.includes(r) ? regions.filter(x => x !== r) : [...regions, r])}>{regionLabel(lang, r)}</button>
                    ))}
                </div>
                <h3>{t(lang, 'setup.count')}</h3>
                <div className="chip-grid">
                    {[5, 10, 15, 20].map(n => <button key={n} className={`toggle-chip ${count === n ? 'on' : ''}`} onClick={() => setCount(n)}>{n}</button>)}
                </div>
                <div className="link-box"><code title={link}>{encodeChallenge(cfg).slice(0, 64)}…</code></div>
                <div className="modal-actions">
                    <button className="action-btn secondary" onClick={onClose}>✕ {t(lang, 'menu.back')}</button>
                    <button className="action-btn primary" onClick={() => onCreate(cfg)}>📋 Copy Link</button>
                    <button className="action-btn tertiary" onClick={() => onPlay(cfg)}>▶️ Play</button>
                </div>
            </div>
        </div>
    );
}
