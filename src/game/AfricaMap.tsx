import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    COUNTRIES, ISLAND_NATIONS, ISLAND_ZOOM, ISLAND_ARCHIPELAGOS, MADAGASCAR_PATH,
    type Region, type Country, getCountryById,
} from './data';
import { type Lang, t, format } from './i18n';

// ---------------------------------------------------------------------------
// High-Precision Natural Earth Africa Mainland Vector Path
// ---------------------------------------------------------------------------
export const AFRICA_MAINLAND_PATH =
    'M 22.8 14.5 ' +
    'C 24.5 13.8 28 14.2 32 14.5 ' +
    'C 35.5 14.8 39 14.2 42.5 13.8 ' +
    'C 43.8 14.5 44.2 16.5 44.5 18.5 ' +
    'C 43.8 20.2 45.2 21.5 47.8 22.2 ' +
    'C 50.5 22.8 53.5 23.5 56.5 22.8 ' +
    'C 58 21.2 60 20.5 62 21.2 ' +
    'C 64.5 21.8 67.5 21.5 69.5 22.2 ' +
    'C 70.8 23.5 70.2 25.8 69.2 27.8 ' +
    'C 68 30.5 67 34 68 37.5 ' +
    'C 68.8 40.2 70.5 42.8 71.5 44.8 ' +
    'C 74 45.5 77.5 45.8 81 45.5 ' +
    'C 83.2 46.5 83.8 49 82 52 ' +
    'C 79.5 55.5 76.5 59.5 73.5 63 ' +
    'C 71 66 69 69 67.5 71.5 ' +
    'C 66 74 65 77 64.5 80.5 ' +
    'C 64 83.5 64.5 86.8 63.8 89.5 ' +
    'C 62.8 92.5 61 95 58.5 96.8 ' +
    'C 56 98.2 53 99.2 50 99 ' +
    'C 46.8 98.5 44.5 96.2 43.5 93.5 ' +
    'C 42.5 89.5 42 85 41.5 80.5 ' +
    'C 41 76.5 40.2 72.5 39.5 68.5 ' +
    'C 38.8 64.5 38 60.5 37.2 56.8 ' +
    'C 36 54 34.5 52 35.2 49.5 ' +
    'C 35 48.2 33 47.5 30.5 47.8 ' +
    'C 27.5 48.2 24.5 48.5 21.5 47.8 ' +
    'C 18.5 46.8 16.5 45 15.2 43 ' +
    'C 14.5 40.5 14.8 38 15.5 35.5 ' +
    'C 16.2 33 14.8 31 16 29.5 ' +
    'C 17.5 27.8 18.2 25 19 22.5 ' +
    'C 19.8 19.5 20.8 16.8 22.8 14.5 Z';

export interface MapProps {
    lang: Lang;
    highlightRegion: Region | null;
    pinCountryId: number | null;
    locatorMode: boolean;
    onCountryClick: (c: Country) => void;
    onLocatorTap: (c: Country | null) => void;
}

export function AfricaMap({ lang, highlightRegion, pinCountryId, locatorMode, onCountryClick, onLocatorTap }: MapProps) {
    const [view, setView] = useState({ s: 1, x: 0, y: 0 });
    const [animating, setAnimating] = useState(false);
    const [hoveredCountry, setHoveredCountry] = useState<Country | null>(null);
    const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
    const pinch = useRef<{ dist: number } | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const lastTap = useRef<number>(0);

    const clamp = (v: { s: number; x: number; y: number }) => {
        const s = Math.min(6, Math.max(1, v.s));
        const lim = (s - 1) * 50;
        return { s, x: Math.min(lim, Math.max(-lim, v.x)), y: Math.min(lim, Math.max(-lim, v.y)) };
    };

    const centerOn = useCallback((cx: number, cy: number, scale: number) => {
        setAnimating(true);
        setView(clamp({ s: scale, x: (50 - cx) * scale, y: (50 - cy) * scale }));
        window.setTimeout(() => setAnimating(false), 560);
    }, []);

    useEffect(() => {
        if (pinCountryId != null) {
            const c = getCountryById(pinCountryId);
            if (c) centerOn(c.x, c.y, ISLAND_NATIONS.has(c.id) ? (ISLAND_ZOOM[c.id] || 4.5) : 2.2);
        }
    }, [pinCountryId, centerOn]);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { px: e.clientX, py: e.clientY, ox: view.x, oy: view.y };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current) return;
        setView(v => clamp({ ...v, x: v.x + (e.clientX - drag.current!.px) * 0.6 * (v.s > 1 ? 1 : 0), y: v.y + (e.clientY - drag.current!.py) * 0.6 * (v.s > 1 ? 1 : 0) }));
        drag.current.px = e.clientX; drag.current.py = e.clientY;
    };
    const onPointerUp = () => { drag.current = null; };
    const onWheel = (e: React.WheelEvent) => {
        setView(v => clamp({ ...v, s: v.s * (e.deltaY < 0 ? 1.15 : 0.87) }));
    };
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinch.current = { dist: Math.hypot(dx, dy) };
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
                const rect = wrapRef.current?.getBoundingClientRect();
                if (rect) {
                    const tx = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
                    const ty = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
                    centerOn(tx, ty, view.s > 2 ? 1 : 3.5);
                }
            }
            lastTap.current = now;
        }
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinch.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.hypot(dx, dy);
            setView(v => clamp({ ...v, s: v.s * (d / pinch.current!.dist) }));
            pinch.current.dist = d;
        }
    };

    const islandOf = (id: number) => ISLAND_NATIONS.has(id);

    return (
        <div
            ref={wrapRef}
            className={`africa-map ${locatorMode ? 'locator' : ''}`}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
            onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        >
            <div
                className="map-transform"
                style={{
                    transform: `translate(${view.x}%, ${view.y}%) scale(${view.s})`,
                    transition: animating || drag.current ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
                }}
            >
                <svg viewBox="0 0 100 100" className="africa-svg" aria-label="Interactive map of Africa">
                    <defs>
                        {/* Ocean Bathymetric Radial Gradient */}
                        <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="70%">
                            <stop offset="0%" stopColor="#0a2540" />
                            <stop offset="60%" stopColor="#061b33" />
                            <stop offset="100%" stopColor="#030e1d" />
                        </radialGradient>

                        {/* Sahara Desert Warm Dunes */}
                        <linearGradient id="sahara-desert-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="50%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>

                        {/* Sahel & Savanna Transition Belt */}
                        <linearGradient id="sahel-savanna-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#84cc16" />
                        </linearGradient>

                        {/* Congo Rainforest Equatorial Emerald */}
                        <radialGradient id="congo-rainforest-grad" cx="45%" cy="55%" r="40%">
                            <stop offset="0%" stopColor="#15803d" />
                            <stop offset="70%" stopColor="#047857" />
                            <stop offset="100%" stopColor="#064e3b" />
                        </radialGradient>

                        {/* East African Rift & Ethiopian Highlands */}
                        <linearGradient id="rift-highlands-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#b45309" />
                            <stop offset="40%" stopColor="#ca8a04" />
                            <stop offset="100%" stopColor="#15803d" />
                        </linearGradient>

                        {/* Kalahari & Southern Scrubland */}
                        <linearGradient id="kalahari-southern-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#d97706" />
                            <stop offset="70%" stopColor="#65a30d" />
                            <stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>

                        {/* Coastal Glow Filter for Oceanic Breakers */}
                        <filter id="coastal-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Ocean Backdrop */}
                    <rect width="100" height="100" fill="url(#ocean-gradient)" />

                    {/* Outer Shoreline Breaker Aura */}
                    <path
                        className="shoreline-outer"
                        d={AFRICA_MAINLAND_PATH}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.4"
                        opacity="0.25"
                        filter="url(#coastal-glow)"
                    />
                    <path
                        className="shoreline-inner"
                        d={AFRICA_MAINLAND_PATH}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        opacity="0.6"
                    />

                    {/* Mainland Base Terrain Polygon */}
                    <path
                        className="africa-land"
                        d={AFRICA_MAINLAND_PATH}
                        fill="#1b4332"
                        stroke="#0f291e"
                        strokeWidth="0.5"
                    />

                    {/* Natural Earth Biome Gradient Overlays */}
                    {/* 1. Sahara Desert (North) */}
                    <path
                        className="biome-layer sahara"
                        d="M 18.5 15 C 30 14 55 14 70 22 C 69 32 67 36 67 38 C 50 37 35 36 15.5 36 C 16 30 17 22 18.5 15 Z"
                        fill="url(#sahara-desert-grad)"
                        opacity="0.55"
                    />
                    {/* 2. Sahel & Savanna Belt */}
                    <path
                        className="biome-layer sahel"
                        d="M 15.5 36 C 35 36 50 37 67 38 C 69 41 70 44 71.5 45 C 50 46 35 47 15.2 43 C 14.8 39 15.2 37.5 15.5 36 Z"
                        fill="url(#sahel-savanna-grad)"
                        opacity="0.45"
                    />
                    {/* 3. Congo Rainforest (Central) */}
                    <path
                        className="biome-layer rainforest"
                        d="M 35 48 C 45 47 55 48 57 52 C 58 56 55 60 48 62 C 41 62 38 60 37 56 C 36 53 34.8 50 35 48 Z"
                        fill="url(#congo-rainforest-grad)"
                        opacity="0.6"
                    />
                    {/* 4. East African Rift & Ethiopian Highlands */}
                    <path
                        className="biome-layer rift"
                        d="M 58 35 C 68 37 72 43 82 48 C 80 54 74 62 67 71 C 63 68 60 60 58 50 C 57 44 57 38 58 35 Z"
                        fill="url(#rift-highlands-grad)"
                        opacity="0.5"
                    />
                    {/* 5. Kalahari & Southern Grasslands */}
                    <path
                        className="biome-layer kalahari"
                        d="M 39 68 C 45 66 55 68 63 74 C 61 88 56 97 50 99 C 44 96 42 88 41 80 C 40.5 75 40 71 39 68 Z"
                        fill="url(#kalahari-southern-grad)"
                        opacity="0.55"
                    />

                    {/* Sub-region Quiz Tint Overlays */}
                    <path className="region-tint north" d="M 16 12 L 72 12 L 72 32 L 18 34 Z" opacity={highlightRegion === 'north' ? 0.6 : 0} />
                    <path className="region-tint west" d="M 14 32 L 40 32 L 40 50 L 16 48 Z" opacity={highlightRegion === 'west' ? 0.6 : 0} />
                    <path className="region-tint central" d="M 38 34 L 58 34 L 58 60 L 38 60 Z" opacity={highlightRegion === 'central' ? 0.6 : 0} />
                    <path className="region-tint east" d="M 56 26 L 82 28 L 74 62 L 56 60 Z" opacity={highlightRegion === 'east' ? 0.6 : 0} />
                    <path className="region-tint southern" d="M 38 58 L 65 58 L 58 98 L 42 98 Z" opacity={highlightRegion === 'southern' ? 0.6 : 0} />
                    <path className="region-tint island" d="M 6 32 L 18 32 L 18 44 L 6 44 Z M 58 54 L 84 54 L 84 82 L 58 82 Z" opacity={highlightRegion === 'island' ? 0.6 : 0} />

                    {/* Madagascar Accurate Polygon */}
                    <g className={`madagascar-group ${pinCountryId === 30 ? 'pinned' : ''}`}>
                        <path
                            className="shoreline-outer"
                            d={MADAGASCAR_PATH}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="2"
                            opacity="0.3"
                            filter="url(#coastal-glow)"
                        />
                        <path
                            className="madagascar-land"
                            d={MADAGASCAR_PATH}
                            fill="url(#congo-rainforest-grad)"
                            stroke="#34d399"
                            strokeWidth="0.4"
                            onClick={(e) => {
                                e.stopPropagation();
                                const mad = getCountryById(30);
                                if (mad) {
                                    if (locatorMode) onLocatorTap(mad);
                                    else onCountryClick(mad);
                                }
                            }}
                        />
                    </g>

                    {/* Island Archipelagos & Pulsing Radar Beacons */}
                    {Array.from(ISLAND_NATIONS).map(id => {
                        const c = getCountryById(id);
                        if (!c) return null;
                        const archNodes = ISLAND_ARCHIPELAGOS[id] || [];
                        const isPinned = pinCountryId === id;
                        const isHighlighted = highlightRegion === 'island' || isPinned;

                        return (
                            <g
                                key={`island-beacon-${id}`}
                                className={`island-beacon-group ${isPinned ? 'pinned' : ''} ${isHighlighted ? 'active' : ''}`}
                                transform={`translate(${c.x} ${c.y})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (locatorMode) onLocatorTap(c);
                                    else onCountryClick(c);
                                }}
                            >
                                {/* Concentric Radar Pulse Rings */}
                                <circle r={3.6} className="island-beacon-pulse pulse-1" />
                                <circle r={5.8} className="island-beacon-pulse pulse-2" />
                                <circle r={2.4} className="island-callout-ring" />

                                {/* Accurate Archipelago Nodes */}
                                {archNodes.map((node, nIdx) => (
                                    <circle
                                        key={nIdx}
                                        cx={node.dx}
                                        cy={node.dy}
                                        r={node.r}
                                        className="archipelago-node"
                                    >
                                        <title>{node.name}</title>
                                    </circle>
                                ))}

                                {/* Island Label Callout */}
                                <text
                                    y={-3.2}
                                    className="island-label"
                                    textAnchor="middle"
                                >
                                    {c.country}
                                </text>
                            </g>
                        );
                    })}

                    {/* Country Hotspots */}
                    {COUNTRIES.map(c => {
                        const isPinned = pinCountryId === c.id;
                        const isHovered = hoveredCountry?.id === c.id;
                        const isIsland = islandOf(c.id);

                        return (
                            <g
                                key={c.id}
                                className={`country-dot r-${c.region} ${isPinned ? 'pinned' : ''} ${isIsland ? 'island' : ''}`}
                                transform={`translate(${c.x} ${c.y})`}
                                onMouseEnter={() => setHoveredCountry(c)}
                                onMouseLeave={() => setHoveredCountry(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (locatorMode) onLocatorTap(c);
                                    else onCountryClick(c);
                                }}
                            >
                                <circle r={isIsland ? 1.6 : 2.0} className="dot-core" />
                                <circle r={5} className="dot-hit" />
                                {isPinned && <circle r={4.5} className="dot-ripple" />}

                                {/* High-DPI Crisp Label (visible when zoomed or pinned/hovered) */}
                                {(view.s > 1.8 || isPinned || isHovered) && !isIsland && (
                                    <text
                                        y={-3.2}
                                        className={`map-country-label ${isPinned ? 'pinned-text' : ''}`}
                                        textAnchor="middle"
                                    >
                                        {c.country}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Map Pan / Zoom Controls */}
            <div className="map-controls">
                <button aria-label="Zoom in" onClick={() => setView(v => clamp({ ...v, s: v.s * 1.3 }))}>＋</button>
                <button aria-label="Zoom out" onClick={() => setView(v => clamp({ ...v, s: v.s / 1.3 }))}>－</button>
                <button aria-label="Reset view" onClick={() => { setAnimating(true); setView({ s: 1, x: 0, y: 0 }); window.setTimeout(() => setAnimating(false), 560); }}>↺</button>
            </div>

            {/* Island Quick Jump Bar */}
            <div className="island-jump">
                {[7, 41, 43, 11, 34, 30].map(id => {
                    const c = getCountryById(id);
                    return c ? (
                        <button
                            key={id}
                            className={pinCountryId === id ? 'active' : ''}
                            onClick={() => centerOn(c.x, c.y, ISLAND_ZOOM[id] || 4.5)}
                        >
                            <span className="jump-badge">🏝️</span>
                            {c.country}
                        </button>
                    ) : null;
                })}
            </div>

            {locatorMode && <div className="locator-hint">{format(t(lang, 'q.locator'), { country: '—' })}</div>}
        </div>
    );
}
export default AfricaMap;
