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
// CLAUDE: is_taped mirrors the DB `mark.is_taped` column — a stroke marked by
// tape mode. Persistent (survives until the stroke is erased), so it lives on
// the stroke itself rather than a transient selection set.
export type Stroke = { id: string; data: StrokePoint[]; color: string; is_taped?: boolean };
export type Mode = "draw" | "erase";
// CLAUDE: tape-mode sub-mode, toggled by the radial reel like write's draw/erase.
export type TapeMode = "select" | "deselect";
// CLAUDE: reel state is pure geometry — `hovered` is which half-disc the cursor
// is over. Each mode maps left/right to its own sub-mode on commit (write →
// draw/erase, tape → select/deselect).
export type ReelState = { x: number; y: number; hovered: "left" | "right" | null } | null;
export type MarkResponse = {
    id: string;
    color: string;
    data: { points: StrokePoint[] };
    is_taped?: boolean;
};
// CLAUDE: tape-mode drag-select rectangle. Storing start + current (not
// x/y/w/h) keeps the math symmetric for drags in any direction — derive the
// rect at render time via Math.min / Math.abs.
export type DragBox = { start: StrokePoint; current: StrokePoint } | null;

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
    tapeMode: TapeMode;
    setTapeMode: React.Dispatch<React.SetStateAction<TapeMode>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    dragBox: DragBox;
    setDragBox: React.Dispatch<React.SetStateAction<DragBox>>;
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

// CLAUDE: shared between write and tape modes. Converts a pointer event's
// viewport coords into the SVG's logical (viewBox) coords.
function getLogicalPoint(
    event: React.PointerEvent<SVGSVGElement>,
    svgRef: React.RefObject<SVGSVGElement | null>,
    logicalWidth: number,
    logicalHeight: number,
): StrokePoint {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
        ((event.clientX - rect.left) / rect.width) * logicalWidth,
        ((event.clientY - rect.top) / rect.height) * logicalHeight,
        event.pressure || 0.5,
    ];
}

// CLAUDE: axis-aligned bounding box of a stroke's points. Shared by the eraser
// hit-test, the tape marquee, and the tape highlight render.
export function getStrokeBounds(points: StrokePoint[]) {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

// CLAUDE: stroke-level point hit-test (eraser + tape de-select). Returns the
// index of the first stroke whose polyline passes within `threshold` logical
// units of `point`, or -1. `eligible` filters which strokes can be hit — the
// eraser skips taped strokes, tape de-select hits only taped ones. Two-phase:
// cheap bbox reject, then per-segment distance check.
export function findStrokeHitAt(
    point: StrokePoint,
    strokes: Stroke[],
    threshold: number,
    eligible: (s: Stroke) => boolean = () => true,
): number {
    const [px, py] = point;
    for (let i = 0; i < strokes.length; i++) {
        if (!eligible(strokes[i])) continue;
        const pts = strokes[i].data;
        const { minX, minY, maxX, maxY } = getStrokeBounds(pts);
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

// CLAUDE: tape-mode marquee hit-test. Returns the ids of all strokes the
// drag box touches (touch/intersect semantics). Two-phase like findStrokeHitAt:
// cheap AABB-vs-AABB reject, then precise point-in-rect on survivors.
export function findStrokesInBox(box: NonNullable<DragBox>, strokes: Stroke[]): string[] {
    // Normalize the drag box so the test is direction-agnostic.
    const boxMinX = Math.min(box.start[0], box.current[0]);
    const boxMaxX = Math.max(box.start[0], box.current[0]);
    const boxMinY = Math.min(box.start[1], box.current[1]);
    const boxMaxY = Math.max(box.start[1], box.current[1]);

    const hits: string[] = [];
    for (const stroke of strokes) {
        const pts = stroke.data;
        // Broad phase: reject if the stroke's bbox can't overlap the drag box.
        const { minX, minY, maxX, maxY } = getStrokeBounds(pts);
        if (maxX < boxMinX || minX > boxMaxX || maxY < boxMinY || minY > boxMaxY)
            continue;
        // Narrow phase: selected if any point falls inside the drag rect.
        for (const [x, y] of pts) {
            if (x >= boxMinX && x <= boxMaxX && y >= boxMinY && y <= boxMaxY) {
                hits.push(stroke.id);
                break;
            }
        }
    }
    return hits;
}

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

    // Eraser threshold in logical units (shared by both erase call sites).
    const eraseThreshold = STROKE_OPTIONS.size * 1.5;
    // CLAUDE: the eraser skips taped strokes — they can't be deleted until
    // un-taped in tape mode (de-select).
    const eraseEligible = (s: Stroke) => !s.is_taped;

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
        const pt = getLogicalPoint(event, svgRef, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        // Erase mode: primary press tries to delete a stroke at the cursor.
        if (mode === "erase") {
            const hit = findStrokeHitAt(pt, strokes, eraseThreshold, eraseEligible);
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
        // point. Left half = draw, right half = erase. A small dead-zone keeps
        // `hovered` null for tiny mouse jitter.
        if (reel) {
            const dx = event.clientX - reel.x;
            const dy = event.clientY - reel.y;
            const dist = Math.hypot(dx, dy);
            const hovered: "left" | "right" | null =
                dist < REEL_DEADZONE_PX ? null : dx < 0 ? "left" : "right";
            if (hovered !== reel.hovered) setReel({ ...reel, hovered });
            return;
        }

        // Only draw/erase when the primary button is pressed.
        if (event.buttons !== 1) return;

        if (mode === "erase") {
            const pt = getLogicalPoint(event, svgRef, LOGICAL_WIDTH, LOGICAL_HEIGHT);
            const hit = findStrokeHitAt(pt, strokes, eraseThreshold, eraseEligible);
            if (hit >= 0) {
                const hitId = strokes[hit].id;
                setStrokes((prev) => prev.filter((_, i) => i !== hit));
                deleteMark(hitId);
            }
            return;
        }

        if (!currentPoints) return;
        const pt = getLogicalPoint(event, svgRef, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        setCurrentPoints((prev) => (prev ? [...prev, pt] : [pt]));
    }

    function onPointerUp() {
        // Reel was open: commit the hovered slice (if any) and close.
        if (reel) {
            if (reel.hovered) setMode(reel.hovered === "left" ? "draw" : "erase");
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

// CLAUDE: tape mode has two reel-toggled sub-modes (like write's draw/erase):
// - "select": drag a marquee box; strokes it touches get a live preview
//   highlight (rendered in page.tsx from dragBox) and are committed as
//   `is_taped=true` on release (additive).
// - "deselect": point-by-point like the eraser — press/drag over taped strokes
//   to un-tape them (`is_taped=false`).
// Both persist to the backend via PUT /mark/:id. The right button opens the reel.
export function useTapeMode(deps: BoardHandlerDeps): BoardHandlers {
    const {
        svgRef,
        strokes,
        setStrokes,
        dragBox,
        setDragBox,
        reel,
        setReel,
        tapeMode,
        setTapeMode,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        STROKE_OPTIONS,
    } = deps;

    // Fire-and-forget tape persist (tape or untape). UI already updated
    // optimistically by the caller. Mirrors pushMarks/deleteMark in useWriteMode.
    async function setMarkTaped(id: string, value: boolean) {
        try {
            await api.put(`/mark/${id}`, { is_taped: value });
        } catch (err: any) {
            console.error("Failed to set mark taped state", id, err);
        }
    }
    // De-select threshold matches the eraser; de-select only hits taped strokes.
    const deselectThreshold = STROKE_OPTIONS.size * 1.5;
    const tapedEligible = (s: Stroke) => !!s.is_taped;
    // Optimistically un-tape a stroke and persist.
    function untapeAt(point: StrokePoint) {
        const hit = findStrokeHitAt(point, strokes, deselectThreshold, tapedEligible);
        if (hit < 0) return;
        const hitId = strokes[hit].id;
        setStrokes((prev) =>
            prev.map((s) => (s.id === hitId ? { ...s, is_taped: false } : s))
        );
        setMarkTaped(hitId, false);
    }

    function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
        // Right button opens the radial reel (Tape | Untape).
        if (event.button === 2) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setReel({ x: event.clientX, y: event.clientY, hovered: null });
            return;
        }
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const pt = getLogicalPoint(event, svgRef, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        // De-select sub-mode: primary press un-tapes a taped stroke at the cursor.
        if (tapeMode === "deselect") {
            untapeAt(pt);
            return;
        }
        // Select sub-mode: start a drag-select box.
        setDragBox({ start: pt, current: pt });
    }
    function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
        // Reel open: highlight the slice by direction (left = Tape, right =
        // Untape), with a dead-zone for jitter.
        if (reel) {
            const dx = event.clientX - reel.x;
            const dy = event.clientY - reel.y;
            const dist = Math.hypot(dx, dy);
            const hovered: "left" | "right" | null =
                dist < REEL_DEADZONE_PX ? null : dx < 0 ? "left" : "right";
            if (hovered !== reel.hovered) setReel({ ...reel, hovered });
            return;
        }
        if (event.buttons !== 1) return;
        const pt = getLogicalPoint(event, svgRef, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        // De-select: drag over taped strokes to un-tape them (like the eraser).
        if (tapeMode === "deselect") {
            untapeAt(pt);
            return;
        }
        // Select: update the drag box; preview highlight derives from it at render.
        if (!dragBox) return;
        setDragBox({ start: dragBox.start, current: pt });
    }
    function onPointerUp() {
        // Reel was open: commit the hovered slice (if any) and close.
        if (reel) {
            if (reel.hovered)
                setTapeMode(reel.hovered === "left" ? "select" : "deselect");
            setReel(null);
            return;
        }
        // De-select happens live on down/move — nothing to commit on release.
        if (tapeMode === "deselect") return;
        if (!dragBox) return;
        // Commit on release: tape every stroke inside the final box that isn't
        // already taped (additive). Skip already-taped ones to avoid redundant
        // network calls.
        const hits = findStrokesInBox(dragBox, strokes);
        const newlyTaped = hits.filter(
            (id) => !strokes.find((s) => s.id === id)?.is_taped
        );
        if (newlyTaped.length > 0) {
            const tapedSet = new Set(newlyTaped);
            setStrokes((prev) =>
                prev.map((s) => (tapedSet.has(s.id) ? { ...s, is_taped: true } : s))
            );
            for (const id of newlyTaped) setMarkTaped(id, true);
        }
        setDragBox(null);
    }
    function onPointerCancel() {
        setReel(null);
        setDragBox(null);
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}