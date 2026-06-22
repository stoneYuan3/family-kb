'use client'

import { startOfWeek, endOfWeek, isAfter, isMonday } from 'date-fns';

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api";
import { getSvgFromStroke } from "@/lib/svgPath";
import { getStroke } from 'perfect-freehand';
import RadialReel from "@/components/board/RadialReel";
import { Pen, Bookmark, Eraser, BookmarkPlus, BookmarkMinus } from "lucide-react";
import {
    useWriteMode,
    useTapeMode,
    findStrokesInBox,
    getStrokeBounds,
    type Stroke,
    type StrokePoint,
    type Mode,
    type TapeMode,
    type ReelState,
    type MarkResponse,
    type DragBox,
} from "./useBoardHandlers";

type InputMode = "write" | "tape";

export default function BoardPage() {

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
    const [tapeMode, setTapeMode] = useState<TapeMode>('select');
    const [inputMode, setInputMode] = useState<InputMode>("write")
    const [reel, setReel] = useState<ReelState>(null);
    const [dragBox, setDragBox] = useState<DragBox>(null);
    const [storedStartOfWeek, setStartOfWeek] = useState<Date | null>()

    const checkAndUpdateWeek = () => {
        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 })
        if(storedStartOfWeek === null) {
            setStartOfWeek(currentWeekStart)
        }
        const isNewWeek = isAfter(currentWeekStart, storedStartOfWeek)
        if(isNewWeek) {
            setStartOfWeek(currentWeekStart)
        }
    }

    // CLAUDE: kill any in-flight drag-box when switching input modes so a
    // tape-mode rectangle doesn't persist into write mode. (Taped state is a
    // stroke property and intentionally survives mode switches.)
    useEffect(() => { setDragBox(null); }, [inputMode]);

    const fetchMarks = async () => {
        try {
            const res = await api.get<MarkResponse[]>(`/mark`);
            // Flatten the backend `{ data: { points } }` shape into the local
            // Stroke where `data` is the points array directly.
            setStrokes(
                res.map(m => ({
                    id: m.id,
                    color: m.color,
                    data: m.data.points,
                    is_taped: m.is_taped ?? false,
                }))
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchMarks();
    }, [])

    // CLAUDE: per-mode pointer-event handlers. Both hooks must be called every
    // render (rules of hooks) — `handlers` picks the active bundle.
    const deps = {
        svgRef,
        strokes, setStrokes,
        currentPoints, setCurrentPoints,
        mode, setMode,
        reel, setReel,
        tapeMode, setTapeMode,
        setError,
        dragBox, setDragBox,
        LOGICAL_WIDTH, LOGICAL_HEIGHT, STROKE_OPTIONS,
    };
    const writeHandlers = useWriteMode(deps);
    const tapeHandlers = useTapeMode(deps);
    const handlers = inputMode === 'write' ? writeHandlers : tapeHandlers;

    if (loading) return <p>Loading board…</p>;
    if (error) return <p>Error: {error}</p>;

    // CLAUDE: live preview of which strokes the in-progress tape box touches.
    // Only in the "select" sub-mode (de-select is point-based, no box). Committed
    // taped strokes render regardless; this set adds the not-yet-released ones so
    // the highlight tracks the drag.
    const previewIds =
        inputMode === 'tape' && tapeMode === 'select' && dragBox
            ? new Set(findStrokesInBox(dragBox, strokes))
            : null;
    // Pad the highlight box so the strip comfortably covers the rendered ink.
    const TAPE_PAD = STROKE_OPTIONS.size;

    // CLAUDE: cursor swaps with input mode (tape takes priority), then with each
    // mode's sub-mode. Tape de-select reuses the eraser cursor (removal). Hotspot
    // offsets are tuned to each icon stored in /public/cursors/.
    const svgCursor = inputMode === 'tape'
        ? tapeMode === 'select'
            ? "url('/cursors/tape.svg') 16 16, crosshair"
            : "url('/cursors/eraser.svg') 5 18, crosshair"
        : mode === 'draw'
            ? "url('/cursors/pen.svg') 3 21, crosshair"
            : "url('/cursors/eraser.svg') 5 18, crosshair";

    return (
        <>
            <div>
                <div className="flex flex-col items-center">
                    <div className="flex w-full max-w-[800px] justify-between mx-4 items-center">
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
                            {/* CLAUDE: tape highlight layer — rendered BELOW all ink so
                                the yellow strip sits behind the writing. A stroke shows a
                                box highlight if it's committed-taped OR in the live drag
                                preview. */}
                            <g className="tape-highlights">
                                {strokes.map((stroke) => {
                                    if (!stroke.is_taped && !previewIds?.has(stroke.id)) return null;
                                    const { minX, minY, maxX, maxY } = getStrokeBounds(stroke.data);
                                    return (
                                        <rect
                                            key={stroke.id}
                                            x={minX - TAPE_PAD}
                                            y={minY - TAPE_PAD}
                                            width={maxX - minX + TAPE_PAD * 2}
                                            height={maxY - minY + TAPE_PAD * 2}
                                            rx={6}
                                            fill="#FCF0C2"
                                            pointerEvents="none"
                                        />
                                    );
                                })}
                            </g>
                            <g>
                                {strokes.map((stroke) => (
                                    <path
                                        key={stroke.id}
                                        d={getSvgFromStroke(getStroke(stroke.data, STROKE_OPTIONS))}
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
            </div>

            {/* CLAUDE: radial reel — rendered while the right button is held.
                Slice descriptors depend on the active input mode: write toggles
                Write|Erase, tape toggles Tape|Untape. */}
            {reel && (
                inputMode === 'write'
                    ? <RadialReel
                        x={reel.x} y={reel.y} hovered={reel.hovered}
                        left={{ icon: <Pen className="w-5 h-5" />, label: "Write", activeColor: "rgba(59,130,246,0.92)" }}
                        right={{ icon: <Eraser className="w-5 h-5" />, label: "Erase", activeColor: "rgba(253,224,71,0.95)" }}
                    />
                    : <RadialReel
                        x={reel.x} y={reel.y} hovered={reel.hovered}
                        left={{ icon: <BookmarkPlus className="w-5 h-5" />, label: "Tape", activeColor: "rgba(59,130,246,0.92)" }}
                        right={{ icon: <BookmarkMinus className="w-5 h-5" />, label: "Untape", activeColor: "rgba(253,224,71,0.95)" }}
                    />
            )}
        </>
    )
}
