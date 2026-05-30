'use client'
import { endOfWeek } from "date-fns";

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api";
import type { Board } from "@/types";
import { getSvgFromStroke } from "@/lib/svgPath";
import { getStroke } from 'perfect-freehand';

type StrokePoint = [number, number, number];
type Stroke = { points: StrokePoint[]; color: string };

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
    function getLogicalPoint(event: React.PointerEvent<SVGSVGElement>): StrokePoint {
        const rect = svgRef.current!.getBoundingClientRect();
        return [
            ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
            ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
            event.pressure || 0.5,
        ]
    }
    function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
        // Capture the pointer so we keep receiving events even if the
        // finger/cursor leaves the SVG bounds during drawing.
        event.currentTarget.setPointerCapture(event.pointerId);

        setCurrentPoints([getLogicalPoint(event)]);
    }
    function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
        // Only draw when the primary button is pressed.
        if (event.buttons !== 1) return;
        if (!currentPoints) return;

        setCurrentPoints(prev => (prev ? [...prev, getLogicalPoint(event)] : [getLogicalPoint(event)]));
    }

    function handlePointerUp() {
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
                                    ref={svgRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
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
        </>
    )
}