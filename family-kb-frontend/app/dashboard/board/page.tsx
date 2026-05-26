'use client'

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
                        <h1>Week of {new Date(board.week_start).toLocaleDateString()}</h1>
                    )
                }
                
            </div>            
        </>
    )
}