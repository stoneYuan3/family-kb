'use client'
import { endOfWeek } from "date-fns";

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api";
import type { Board } from "@/types";
import { getSvgFromStroke } from "@/lib/svgPath";
import { getStroke } from 'perfect-freehand';
import RadialReel, { type ReelMode } from "@/components/board/RadialReel";

type StrokePoint = [number, number, number];
type Stroke = { points: StrokePoint[]; color: string };
type Mode = ReelMode;
// CLAUDE: reel state — null when closed; otherwise the open point and the
// currently hovered slice (decided by direction from the open point).
type ReelState = { x: number; y: number; hovered: Mode | null } | null;

// Movement must exceed this many viewport px before a slice is highlighted —
// a quick right-click with no drag opens-then-closes without changing mode.
const REEL_DEADZONE_PX = 12;

export default function BoardPage() {

    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dayNames = ["Mon", "Tue", "Wed", "Thr", "Fri", "Sat", "Sun"]
    const LOGICAL_WIDTH = 1400;
    const LOGICAL_HEIGHT = 900;
    const STROKE_OPTIONS = {
        size: 6,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
    };
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPoints, setCurrentPoints] = useState<StrokePoint[] | null>(null);
    const [mode, setMode] = useState<Mode>('draw');
    const [reel, setReel] = useState<ReelState>(null);

    // CLAUDE: stroke-level eraser hit-test. Returns the index of the first
    // stroke whose polyline passes within `threshold` logical units of the
    // cursor, or -1 if none. Cheap bbox reject first, then per-segment
    // distance check.
    function findStrokeHitAt(point: StrokePoint, threshold = STROKE_OPTIONS.size * 1.5): number {
        const [px, py] = point;
        for (let i = 0; i < strokes.length; i++) {
            const pts = strokes[i].points;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const [x, y] of pts) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            if (px < minX - threshold || px > maxX + threshold ||
                py < minY - threshold || py > maxY + threshold) continue;
            for (let s = 0; s < pts.length - 1; s++) {
                const [x1, y1] = pts[s];
                const [x2, y2] = pts[s + 1];
                const dx = x2 - x1, dy = y2 - y1;
                const len2 = dx * dx + dy * dy;
                if (len2 === 0) continue;
                let t = ((px - x1) * dx + (py - y1) * dy) / len2;
                t = Math.max(0, Math.min(1, t));
                const cx = x1 + t * dx;
                const cy = y1 + t * dy;
                const d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
                if (d2 <= threshold * threshold) return i;
            }
        }
        return -1;
    }

    function getLogicalPoint(event: React.PointerEvent<SVGSVGElement>): StrokePoint {
        const rect = svgRef.current!.getBoundingClientRect();
        return [
            ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
            ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
            event.pressure || 0.5,
        ]
    }
    function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
        // Right button (or stylus barrel button) opens the radial reel.
        if (event.button === 2) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setReel({ x: event.clientX, y: event.clientY, hovered: null });
            return;
        }

        // Capture the pointer so we keep receiving events even if the
        // finger/cursor leaves the SVG bounds during drawing.
        event.currentTarget.setPointerCapture(event.pointerId);
        const pt = getLogicalPoint(event);

        // Erase mode: primary press tries to delete a stroke at the cursor.
        if (mode === 'erase') {
            const hit = findStrokeHitAt(pt);
            if (hit >= 0) setStrokes(prev => prev.filter((_, i) => i !== hit));
            return;
        }

        setCurrentPoints([pt]);
    }
    function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
        // Reel open: highlight the slice based on direction from the open
        // point. Left of center = draw, right of center = erase. A small
        // dead-zone keeps `hovered` null for tiny mouse jitter.
        if (reel) {
            const dx = event.clientX - reel.x;
            const dy = event.clientY - reel.y;
            const dist = Math.hypot(dx, dy);
            const hovered: Mode | null =
                dist < REEL_DEADZONE_PX ? null : (dx < 0 ? 'draw' : 'erase');
            if (hovered !== reel.hovered) setReel({ ...reel, hovered });
            return;
        }

        // Only draw/erase when the primary button is pressed.
        if (event.buttons !== 1) return;

        if (mode === 'erase') {
            const pt = getLogicalPoint(event);
            const hit = findStrokeHitAt(pt);
            if (hit >= 0) setStrokes(prev => prev.filter((_, i) => i !== hit));
            return;
        }

        if (!currentPoints) return;
        setCurrentPoints(prev => (prev ? [...prev, getLogicalPoint(event)] : [getLogicalPoint(event)]));
    }

    function handlePointerUp() {
        // Reel was open: commit the hovered slice (if any) and close.
        if (reel) {
            if (reel.hovered) setMode(reel.hovered);
            setReel(null);
            return;
        }

        if (mode === 'erase') return;

        if (!currentPoints || currentPoints.length === 0) {
            setCurrentPoints(null);
            return;
        }

        // Commit the in-progress stroke to the strokes array.
        setStrokes(prev => [
            ...prev,
            { points: currentPoints, color: '#222' },
        ]);
        setCurrentPoints(null);
    }

    function handlePointerCancel() {
        // Tablet/touch can drop a gesture mid-stream — clean up both states.
        setReel(null);
        setCurrentPoints(null);
    }

    const fetchBoard = async () => {
        try {
            const res = await api.get<Board>(`/board/current`);
            // if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res;
            console.log(data)
            setBoard(data)
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchBoard();
    }, [])

    if (loading) return <p>Loading board…</p>;
    if (error) return <p>Error: {error}</p>;

    // CLAUDE: cursor swaps with mode. Hotspot offsets are tuned to the tip of
    // each lucide icon stored in /public/cursors/.
    const svgCursor = mode === 'draw'
        ? "url('/cursors/pen.svg') 3 21, crosshair"
        : "url('/cursors/eraser.svg') 5 18, crosshair";

    return (
        <>
            <div>
                {
                    board != null && (
                        <div className="flex flex-col items-center">
                            <h1 className="my-6">{new Date(board.week_start).toLocaleDateString()} - {endOfWeek(new Date(board.week_start)).toLocaleDateString()}</h1>
                            <div className="w-full h-full mb-10 aspect-[14:9] canvas-wrapper">
                                <svg
                                    viewBox={`0 0 ${LOGICAL_WIDTH} ${LOGICAL_HEIGHT}`} className="border-4 border-grey-100 rounded-md mx-4"
                                    style={{ cursor: svgCursor }}
                                    ref={svgRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerCancel}
                                    onContextMenu={(e) => e.preventDefault()}
                                >
                                    <g className="calendar-grid">
                                        {/* 7 vertical lines */}
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <line key={i} x1={i * 200} y1={100} x2={i * 200} y2={850}
                                                stroke="#c5c5c5" strokeWidth={1} />
                                        ))}
                                        {/* Day labels */}
                                        {dayNames.map((name, i) => (
                                            <text className="select-none pointer-events-none pointerdown" key={name} x={i * 200 + 100} y={50}
                                                textAnchor="middle" fontSize={20} color="#c5c5c5">
                                                {name}
                                            </text>
                                        ))}
                                    </g>
                                    <g>
                                        {strokes.map((stroke, i) => (
                                            <path
                                                key={i}
                                                d={getSvgFromStroke(getStroke(stroke.points, STROKE_OPTIONS))}
                                                fill={stroke.color}
                                            />
                                        ))}

                                        {/* Render the in-progress stroke if there is one */}
                                        {currentPoints && (
                                            <path
                                                d={getSvgFromStroke(getStroke(currentPoints, STROKE_OPTIONS))}
                                                fill="#222"
                                            />
                                        )}
                                    </g>
                                </svg>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* CLAUDE: radial reel — rendered while the right button is held. */}
            {reel && <RadialReel x={reel.x} y={reel.y} hovered={reel.hovered} />}
        </>
    )
}