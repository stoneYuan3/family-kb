'use client'
// CLAUDE: radial "functionality reel" shown while the right mouse button is
// held on the board. Visual only — the board page handles pointer math and
// commits the highlighted slice on right-button release.
import { Pen, Eraser } from 'lucide-react';

export type ReelMode = 'draw' | 'erase';

interface Props {
    x: number;            // viewport px where the reel opened
    y: number;
    hovered: ReelMode | null;
}

const RADIUS = 52;

export default function RadialReel({ x, y, hovered }: Props) {
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
                {/* Left half — write/draw */}
                <path
                    d={`M 0 -${RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 0 ${RADIUS} Z`}
                    fill={hovered === 'draw' ? 'rgba(59,130,246,0.92)' : 'rgba(255,255,255,0.92)'}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                />
                {/* Right half — erase */}
                <path
                    d={`M 0 -${RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 0 ${RADIUS} Z`}
                    fill={hovered === 'erase' ? 'rgba(253,224,71,0.95)' : 'rgba(255,255,255,0.92)'}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                />
            </svg>

            {/* Icons + labels overlaid on each half */}
            <div className="absolute inset-0 flex items-center justify-between px-3 text-gray-800">
                <div className="flex flex-col items-center gap-1">
                    <Pen className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Write</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Eraser className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Erase</span>
                </div>
            </div>
        </div>
    );
}
