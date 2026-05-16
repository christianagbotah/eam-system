'use client';

import { Html } from '@react-three/drei';
import { useDigitalTwinStore, type DigitalTwinAnnotation } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface AnnotationLayerProps {
  /** Override annotations from the store (optional) */
  annotations?: DigitalTwinAnnotation[];
}

// ============================================================================
// Single Annotation Component
// ============================================================================

interface AnnotationPinProps {
  annotation: DigitalTwinAnnotation;
}

function AnnotationPin({ annotation }: AnnotationPinProps) {
  // CSS-driven float animation via className
  const floatClass = 'animate-bounce';

  return (
    <Html
      position={[
        annotation.position[0],
        annotation.position[1] + 0.3,
        annotation.position[2],
      ]}
      center
      distanceFactor={15}
      zIndexRange={[15, 0]}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex flex-col items-center group">
        {/* Annotation pin marker */}
        <div
          className="relative cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin icon */}
          <div className="h-7 w-7 rounded-full bg-slate-800/90 border border-slate-500/50 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-110"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="12" y1="6" x2="12" y2="12" />
            </svg>
          </div>

          {/* Connecting stem */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px"
            style={{
              height: '12px',
              background: 'linear-gradient(to bottom, #94a3b8, transparent)',
            }}
          />
        </div>

        {/* Annotation card (visible on hover) */}
        <div
          className="mt-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        >
          <div
            className="px-3 py-2 rounded-lg shadow-2xl max-w-[180px]"
            style={{
              background: 'rgba(10,10,20,0.92)',
              border: '1px solid rgba(148,163,184,0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Author + timestamp */}
            {(annotation.author || annotation.createdAt) && (
              <div className="flex items-center justify-between mb-1">
                {annotation.author && (
                  <span className="text-[9px] text-slate-400 font-medium">
                    {annotation.author}
                  </span>
                )}
                {annotation.createdAt && (
                  <span className="text-[8px] text-slate-500">
                    {new Date(annotation.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Annotation text */}
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {annotation.text}
            </p>
          </div>
        </div>
      </div>
    </Html>
  );
}

// ============================================================================
// Main AnnotationLayer Component
// ============================================================================

export function AnnotationLayer({ annotations: externalAnnotations }: AnnotationLayerProps) {
  const annotationsVisible = useDigitalTwinStore((s) => s.annotationsVisible);
  const storeAnnotations = useDigitalTwinStore((s) => s.currentScene?.annotations ?? []);

  const annotations = externalAnnotations ?? storeAnnotations;

  if (!annotationsVisible || annotations.length === 0) return null;

  return (
    <group>
      {annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
        />
      ))}
    </group>
  );
}

export default AnnotationLayer;
