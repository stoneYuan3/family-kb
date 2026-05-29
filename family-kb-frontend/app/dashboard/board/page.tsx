'use client'
const { endOfWeek } = require("date-fns");

import { useEffect, useState } from "react"
import { api } from "@/lib/api";
import type { Board } from "@/types";

export default function BoardPage() {

    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const dayNames = ["Mon","Tue","Wed","Thr","Fri","Sat","Sun"]

    const fetchBoard = async () => {
        try {
            const res = await api.get<Board>(`/board/current`);
            // if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res;
            console.log(data)
            setBoard(data)
        } catch (err:any) {
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
                                <svg viewBox="0 0 1400 900" className="border-4 border-grey-100 rounded-md mx-4">
                                    <g className="calendar-grid">
                                    {/* 7 vertical lines */}
                                    {[1,2,3,4,5,6].map(i => (
                                        <line key={i} x1={i * 200} y1={100} x2={i * 200} y2={850}
                                            stroke="#c5c5c5" strokeWidth={1} />
                                    ))}
                                    {/* Day labels */}
                                    {dayNames.map((name, i) => (
                                        <text key={name} x={i * 200 + 100} y={50}
                                            textAnchor="middle" fontSize={20} color="#c5c5c5">
                                        {name}
                                        </text>
                                    ))}
                                    </g>
                                    <g>
                                        <path d="M 142 88 L 144 89 L 147 91" stroke="#ff5577" strokeWidth="3" />
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