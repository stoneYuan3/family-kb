'use client'
import { endOfWeek } from "date-fns";

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api";
import type { Board } from "@/types";
import { getSvgFromStroke } from "@/lib/svgPath";
import { getStroke } from 'perfect-freehand';
import RadialReel from "@/components/board/RadialReel";
import { Pen, Bookmark } from "lucide-react";
import {
    useWriteMode,
    useTapeMode,
    type Stroke,
    type StrokePoint,
    type Mode,
    type ReelState,
    type MarkResponse,
    type DragBox,
} from "./useBoardHandlers";

type InputMode = "write" | "tape";
type BoardResult = { board: Board; marks: MarkResponse[] };

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
    const [inputMode, setInputMode] = useState<InputMode>("write")
    const [reel, setReel] = useState<ReelState>(null);
    const [dragBox, setDragBox] = useState<DragBox>(null);

    // CLAUDE: kill any in-flight drag-box when switching input modes so a
    // tape-mode rectangle doesn't persist into write mode.
    useEffect(() => { setDragBox(null); }, [inputMode]);

    const fetchBoard = async () => {
        try {
            const res = await api.get<BoardResult>(`/board/current`);
            setBoard(res.board);
            // Flatten the backend `{ data: { points } }` shape into the local
            // Stroke where `data` is the points array directly.
            setStrokes(
                res.marks.map(m => ({
                    id: m.id,
                    color: m.color,
                    data: m.data.points,
                }))
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchBoard();
    }, [])

    // CLAUDE: per-mode pointer-event handlers. Both hooks must be called every
    // render (rules of hooks) — `handlers` picks the active bundle.
    const deps = {
        svgRef,
        strokes, setStrokes,
        currentPoints, setCurrentPoints,
        mode, setMode,
        reel, setReel,
        setError,
        dragBox, setDragBox,
        LOGICAL_WIDTH, LOGICAL_HEIGHT, STROKE_OPTIONS,
    };
    const writeHandlers = useWriteMode(deps);
    const tapeHandlers = useTapeMode(deps);
    const handlers = inputMode === 'write' ? writeHandlers : tapeHandlers;

    if (loading) return <p>Loading board…</p>;
    if (error) return <p>Error: {error}</p>;

    // CLAUDE: cursor swaps with input mode (tape takes priority), then with
    // write-mode's draw/erase sub-mode. Hotspot offsets are tuned to each icon
    // stored in /public/cursors/.
    const svgCursor = inputMode === 'tape'
        ? "url('/cursors/tape.svg') 16 16, crosshair"
        : mode === 'draw'
            ? "url('/cursors/pen.svg') 3 21, crosshair"
            : "url('/cursors/eraser.svg') 5 18, crosshair";

    return (
        <>
            <div>
                {
                    board != null && (
                        <div className="flex flex-col items-center">
                            <div className="flex w-full max-w-[800px] justify-between mx-4 items-center">
                                <h1 className="my-6">{new Date(board.week_start).toLocaleDateString()} - {endOfWeek(new Date(board.week_start)).toLocaleDateString()}</h1>
                                <div className="flex gap-[32px] items-center">
                                    <button
                                        aria-label="Write"
                                        onClick={() => setInputMode("write")}
                                        className={`h-fit rounded-full px-3 py-2 ${inputMode === "write" ? "bg-black text-white" : ""}`}
                                    >
                                        <Pen />
                                    </button>
                                    <button
                                        aria-label="Tape"
                                        onClick={() => setInputMode("tape")}
                                        className={`h-fit rounded-full px-3 py-2 ${inputMode === "tape" ? "bg-black text-white" : ""}`}
                                    >
                                        <Bookmark />
                                    </button>
                                </div>
                            </div>    
                            <div className="w-full h-full mb-10 aspect-[14:9] canvas-wrapper">
                                <svg
                                    viewBox={`0 0 ${LOGICAL_WIDTH} ${LOGICAL_HEIGHT}`} className="border-4 border-grey-100 rounded-md mx-4"
                                    style={{ cursor: svgCursor }}
                                    ref={svgRef}
                                    onPointerDown={handlers.onPointerDown}
                                    onPointerMove={handlers.onPointerMove}
                                    onPointerUp={handlers.onPointerUp}
                                    onPointerCancel={handlers.onPointerCancel}
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
                                                d={getSvgFromStroke(getStroke(stroke.data, STROKE_OPTIONS))}
                                                fill={stroke.color}
                                                className="bg-red-500"
                                            />
                                        ))}
                                        {/* Render the in-progress stroke if there is one */}
                                        {currentPoints && (
                                            <path
                                                d={getSvgFromStroke(getStroke(currentPoints, STROKE_OPTIONS))}
                                                fill="#222"
                                            />
                                        )}
                                        {/* CLAUDE: tape-mode drag-select rectangle. */}
                                        {dragBox && (
                                            <rect
                                                x={Math.min(dragBox.start[0], dragBox.current[0])}
                                                y={Math.min(dragBox.start[1], dragBox.current[1])}
                                                width={Math.abs(dragBox.start[0] - dragBox.current[0])}
                                                height={Math.abs(dragBox.start[1] - dragBox.current[1])}
                                                fill="rgba(59, 130, 246, 0.08)"
                                                stroke="rgba(59, 130, 246, 0.7)"
                                                strokeWidth={1}
                                                strokeDasharray="4 2"
                                                pointerEvents="none"
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