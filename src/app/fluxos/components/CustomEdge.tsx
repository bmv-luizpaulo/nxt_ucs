import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const labelText = typeof label === 'string' ? label : '';
  const isNegative = labelText.toLowerCase() === 'recusado' || labelText.toLowerCase() === 'não' || labelText.toLowerCase() === 'else';
  const isPositive = labelText.toLowerCase() === 'aprovado' || labelText.toLowerCase() === 'sim' || labelText.toLowerCase() === 'if';

  const labelColor = isNegative ? 'text-red-600 border-red-200 bg-red-50' : isPositive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-500 border-slate-200 bg-slate-50';

  return (
    <>
      <path
        id={id}
        style={{
          stroke: isNegative ? '#fca5a5' : isPositive ? '#6ee7b7' : '#cbd5e1',
          strokeWidth: 2.5,
          ...style,
        }}
        className="react-flow__edge-path transition-all hover:stroke-indigo-400"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nodrag nopan px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-sm ${labelColor}`}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
export default CustomEdge;
