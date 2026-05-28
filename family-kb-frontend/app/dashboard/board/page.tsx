'use client'
const { endOfWeek } = require("date-fns");

import { useEffect, useState } from "react"
import { api } from "@/lib/api";
import type { Board } from "@/types";

export default function BoardPage() {

    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                                <svg viewBox="0 0 1400 900" className="bg-red-100">

                                </svg>
                            </div>
                        </div>
                    )
                }
                
            </div>            
        </>
    )
}