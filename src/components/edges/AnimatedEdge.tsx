import { getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useSimulationState } from '../SimulationContext';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  label,
  markerEnd,
}: EdgeProps) {
  const sim = useSimulationState();
  const isVisited = sim.visitedEdgeIds.has(id);
  const isDimmed = sim.status !== 'idle' && !isVisited;
  const strokeColor = isVisited ? '#06b6d4' : isDimmed ? '#374151' : '#3b82f6';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={3}
        opacity={isDimmed ? 0.1 : 0.3}
        style={isDimmed ? undefined : { filter: `drop-shadow(0 0 4px ${strokeColor})` }}
      />
      {/* Animated dashed layer */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray="8 4"
        markerEnd={markerEnd}
        opacity={isDimmed ? 0.3 : 1}
        style={isDimmed ? undefined : { animation: 'dash 1.5s linear infinite' }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-slate-900 border border-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
