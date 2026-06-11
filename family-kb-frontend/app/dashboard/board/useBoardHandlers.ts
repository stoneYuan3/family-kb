// CLAUDE: board pointer-event handlers, split by input mode.
//
// page.tsx binds onPointerDown/Move/Up/Cancel on the SVG. The mechanism
// behind those events differs between write mode (drawing strokes, erasing,
// radial reel) and tape mode (TBD). Each mode owns one hook here that
// returns the four handler functions. page.tsx calls both hooks every render
// (rules of hooks) and picks the active bundle based on `inputMode`.
import type React from "react";
import { api } from "@/lib/api";
import type { Board } from "@/types";

// ---- shared types --------------------------------------------------------

export type StrokePoint = [number, number, number];
export type Stroke = { id: string; data: StrokePoint[]; color: string };
export type Mode = "draw" | "erase";
export type ReelState = { x: number; y: number; hovered: Mode | null } | null;
export type MarkResponse = {
    id: string;
    color: string;
    data: { points: StrokePoint[] };
};

export type BoardHandlers = {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
};

// All deps the write-mode handlers need. Tape mode receives the same shape
// today (so swapping is cheap); its stubs ignore most fields.
export type BoardHandlerDeps = {
    svgRef: React.RefObject<SVGSVGElement | null>;
    strokes: Stroke[];
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
    currentPoints: StrokePoint[] | null;
    setCurrentPoints: React.Dispatch<React.SetStateAction<StrokePoint[] | null>>;
    mode: Mode;
    setMode: React.Dispatch<React.SetStateAction<Mode>>;
    reel: ReelState;
    setReel: React.Dispatch<React.SetStateAction<ReelState>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    LOGICAL_WIDTH: number;
    LOGICAL_HEIGHT: number;
    STROKE_OPTIONS: {
        size: number;
        thinning: number;
        smoothing: number;
        streamline: number;
    };
};

// ---- write mode ----------------------------------------------------------

// Movement must exceed this many viewport px before a slice is highlighted —
// a quick right-click with no drag opens-then-closes without changing mode.
const REEL_DEADZONE_PX = 12;

export function useWriteMode(deps: BoardHandlerDeps): BoardHandlers {
    const {
        svgRef,
        strokes,
        setStrokes,
        currentPoints,
        setCurrentPoints,
        mode,
        setMode,
        reel,
        setReel,
        setError,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        STROKE_OPTIONS,
    } = deps;

    // POST a freshly-committed stroke to the backend. Fire-and-forget for the
    // UI — the stroke is already in local state by the time this runs.
    async function pushMarks(marks: Stroke) {
        try {
            await api.post<Board>(`/board/current`, { body: marks });
        } catch (err: any) {
            console.error("Failed to push mark", err);
        }
    }
    // Fire-and-forget delete. UI already updated optimistically by the caller.
    async function deleteMark(id: string) {
        try {
            await api.delete(`/mark/${id}`);
        } catch (err: any) {
            console.error("Failed to delete mark", id, err);
        }
    }

    // Stroke-level eraser hit-test. Returns the index of the first stroke
    // whose polyline passes within `threshold` logical units of the cursor,
    // or -1 if none. Cheap bbox reject first, then per-segment distance check.
    function findStrokeHitAt(
        point: StrokePoint,
        threshold = STROKE_OPTIONS.size * 1.5
    ): number {
        const [px, py] = point;
        for (let i = 0; i < strokes.length; i++) {
            const pts = strokes[i].data;
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            for (const [x, y] of pts) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            if (
                px < minX - threshold ||
                px > maxX + threshold ||
                py < minY - threshold ||
                py > maxY + threshold
            )
                continue;
            for (let s = 0; s < pts.length - 1; s++) {
                const [x1, y1] = pts[s];
                const [x2, y2] = pts[s + 1];
                const dx = x2 - x1,
                    dy = y2 - y1;
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

    function getLogicalPoint(
        event: React.PointerEvent<SVGSVGElement>
    ): StrokePoint {
        const rect = svgRef.current!.getBoundingClientRect();
        return [
            ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
            ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
            event.pressure || 0.5,
        ];
    }

    function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
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
        if (mode === "erase") {
            const hit = findStrokeHitAt(pt);
            if (hit >= 0) {
                const hitId = strokes[hit].id;
                setStrokes((prev) => prev.filter((_, i) => i !== hit));
                deleteMark(hitId);
            }
            return;
        }
        setCurrentPoints([pt]);
    }

    function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
        // Reel open: highlight the slice based on direction from the open
        // point. Left of center = draw, right of center = erase. A small
        // dead-zone keeps `hovered` null for tiny mouse jitter.
        if (reel) {
            const dx = event.clientX - reel.x;
            const dy = event.clientY - reel.y;
            const dist = Math.hypot(dx, dy);
            const hovered: Mode | null =
                dist < REEL_DEADZONE_PX ? null : dx < 0 ? "draw" : "erase";
            if (hovered !== reel.hovered) setReel({ ...reel, hovered });
            return;
        }

        // Only draw/erase when the primary button is pressed.
        if (event.buttons !== 1) return;

        if (mode === "erase") {
            const pt = getLogicalPoint(event);
            const hit = findStrokeHitAt(pt);
            if (hit >= 0) {
                const hitId = strokes[hit].id;
                setStrokes((prev) => prev.filter((_, i) => i !== hit));
                deleteMark(hitId);
            }
            return;
        }

        if (!currentPoints) return;
        setCurrentPoints((prev) =>
            prev ? [...prev, getLogicalPoint(event)] : [getLogicalPoint(event)]
        );
    }

    function onPointerUp() {
        // Reel was open: commit the hovered slice (if any) and close.
        if (reel) {
            if (reel.hovered) setMode(reel.hovered);
            setReel(null);
            return;
        }

        if (mode === "erase") return;

        if (!currentPoints || currentPoints.length === 0) {
            setCurrentPoints(null);
            return;
        }

        const currentStroke: Stroke = {
            id: crypto.randomUUID(),
            data: currentPoints,
            color: "#222",
        };
        // Commit the in-progress stroke to the strokes array.
        setStrokes((prev) => [...prev, currentStroke]);
        pushMarks(currentStroke);
        setCurrentPoints(null);
    }

    function onPointerCancel() {
        // Tablet/touch can drop a gesture mid-stream — clean up both states.
        setReel(null);
        setCurrentPoints(null);
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}

// ---- tape mode -----------------------------------------------------------

// CLAUDE: stub. Same signature as useWriteMode so the JSX binding doesn't
// care which mode is active. Mechanism TBD — fill in onPointerDown/Move/Up
// when the tape feature is designed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTapeMode(_deps: BoardHandlerDeps): BoardHandlers {
    function onPointerDown(_event: React.PointerEvent<SVGSVGElement>) {
        // TBD: tape mode pointer-down behavior.
    }
    function onPointerMove(_event: React.PointerEvent<SVGSVGElement>) {
        // TBD: tape mode pointer-move behavior.
    }
    function onPointerUp() {
        // TBD: tape mode pointer-up behavior.
    }
    function onPointerCancel() {
        // TBD: tape mode pointer-cancel behavior.
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}