'use client'
// CLAUDE: radial "functionality reel" shown while the right mouse button is
// held on the board. Visual only — the board page handles pointer math and
// commits the highlighted slice on right-button release. Generic over its two
// slices so both write mode (Write | Erase) and tape mode (Tape | Untape)
// reuse it: callers pass the icon, label, and active fill for each half.
import type { ReactNode } from 'react';

// One half-disc of the reel.
export interface ReelSlice {
    icon: ReactNode;
    label: string;
    activeColor: string;   // fill when this side is hovered
}

interface Props {
    x: number;            // viewport px where the reel opened
    y: number;
    hovered: 'left' | 'right' | null;
    left: ReelSlice;
    right: ReelSlice;
}

const RADIUS = 52;
const IDLE_FILL = 'rgba(255,255,255,0.92)';

export default function RadialReel({ x, y, hovered, left, right }: Props) {
    return (
        <div
            className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 drop-shadow-md"
            style={{ left: x, top: y, width: RADIUS * 2, height: RADIUS * 2 }}
            aria-hidden
        >
            <svg
                viewBox={`-${RADIUS} -${RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
                width={RADIUS * 2}
                height={RADIUS * 2}
            >
                {/* Left half */}
                <path
                    d={`M 0 -${RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 0 ${RADIUS} Z`}
                    fill={hovered === 'left' ? left.activeColor : IDLE_FILL}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                />
                {/* Right half */}
                <path
                    d={`M 0 -${RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 0 ${RADIUS} Z`}
                    fill={hovered === 'right' ? right.activeColor : IDLE_FILL}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                />
            </svg>

            {/* Icons + labels overlaid on each half */}
            <div className="absolute inset-0 flex items-center justify-between px-3 text-gray-800">
                <div className="flex flex-col items-center gap-1">
                    {left.icon}
                    <span className="text-[10px] font-medium">{left.label}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    {right.icon}
                    <span className="text-[10px] font-medium">{right.label}</span>
                </div>
            </div>
        </div>
    );
}
