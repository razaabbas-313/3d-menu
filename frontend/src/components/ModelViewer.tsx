import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';

export type ModelViewerHandle = {
  activateAR: () => void;
  resetCamera: () => void;
  setCameraOrbit?: (orbit: string) => void;
  readonly canActivateAR: boolean;
};

export type PlatePlacement = 'plate' | 'slate' | 'marble' | 'wood' | 'minimal' | 'none';

type Props = {
  src: string;
  alt: string;
  poster?: string;
  ar?: boolean;
  autoRotate?: boolean;
  scale?: number | null;
  placement?: PlatePlacement | string | null;
  exposure?: number | string;
  environmentImage?: string;
  showControls?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onArSupport?: (supported: boolean) => void;
  className?: string;
};

type Element3D = HTMLElement & {
  activateAR?: () => void;
  canActivateAR?: boolean;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  jumpCameraToGoal?: () => void;
};

/**
 * Enhanced wrapper around Google's <model-viewer>.
 * Features:
 * - Culinary plate/pedestal staging (ceramic, slate, marble, wood)
 * - Model scale normalization and sizing
 * - bounds="tight" with portrait FOV for gourmet food presentation
 * - Touch-friendly responsive controls (zoom, reset camera, rotate toggle)
 */
export const ModelViewer = forwardRef<ModelViewerHandle, Props>(function ModelViewer(
  {
    src,
    alt,
    poster,
    ar = true,
    autoRotate: initialAutoRotate = true,
    scale = 1.0,
    placement = 'plate',
    exposure = '1.05',
    environmentImage = 'neutral',
    showControls = true,
    onLoad,
    onError,
    onArSupport,
    className = ''
  },
  handle
) {
  const el = useRef<Element3D | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isRotating, setIsRotating] = useState(initialAutoRotate);
  const callbacks = useRef({ onLoad, onError, onArSupport });
  callbacks.current = { onLoad, onError, onArSupport };

  useEffect(() => {
    let alive = true;
    import('@google/model-viewer')
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const resetCamera = () => {
    const node = el.current;
    if (!node) return;
    node.setAttribute('camera-orbit', '0deg 70deg 105%');
    node.setAttribute('camera-target', 'auto auto auto');
    node.setAttribute('field-of-view', '30deg');
    node.jumpCameraToGoal?.();
  };

  const setCameraOrbit = (orbit: string) => {
    const node = el.current;
    if (!node) return;
    node.setAttribute('camera-orbit', orbit);
    node.jumpCameraToGoal?.();
  };

  useImperativeHandle(handle, () => ({
    activateAR: () => el.current?.activateAR?.(),
    resetCamera,
    setCameraOrbit,
    get canActivateAR() {
      return Boolean(el.current?.canActivateAR);
    }
  }));

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const node = el.current;
    if (!node || !ready) return;
    const onLoadEvt = () => {
      setLoaded(true);
      callbacks.current.onLoad?.();
      callbacks.current.onArSupport?.(Boolean(node.canActivateAR));
    };
    const onErrorEvt = () => {
      setFailed(true);
      callbacks.current.onError?.();
    };
    node.addEventListener('load', onLoadEvt);
    node.addEventListener('error', onErrorEvt);
    return () => {
      node.removeEventListener('load', onLoadEvt);
      node.removeEventListener('error', onErrorEvt);
    };
  }, [ready, src]);

  const numericScale = Math.max(0.2, Math.min(Number(scale) || 1.0, 4.0));
  const activePlacement = (placement as PlatePlacement) || 'plate';

  const attrs: Record<string, unknown> = {
    ref: el,
    src,
    alt,
    'camera-controls': '',
    'touch-action': 'pan-y',
    'shadow-intensity': '1.8',
    'shadow-softness': '0.45',
    exposure: String(exposure),
    'environment-image': environmentImage,
    'interaction-prompt': 'none',
    'auto-rotate-delay': '1200',
    'interpolation-decay': '200',
    bounds: 'tight',
    'camera-orbit': '0deg 70deg 105%',
    'field-of-view': '30deg',
    scale: `${numericScale} ${numericScale} ${numericScale}`
  };

  if (poster) attrs.poster = poster;
  if (isRotating) attrs['auto-rotate'] = '';
  if (ar) {
    attrs.ar = '';
    attrs['ar-modes'] = 'webxr scene-viewer quick-look';
    attrs['ar-scale'] = 'auto';
  }

  const zoom = (direction: 'in' | 'out') => {
    const node = el.current;
    if (!node) return;
    const currentFov = parseFloat(node.getAttribute('field-of-view') || '30deg');
    const newFov = direction === 'in' ? Math.max(16, currentFov - 5) : Math.min(46, currentFov + 5);
    node.setAttribute('field-of-view', `${newFov}deg`);
  };

  return (
    <div className={`mv mv-stage mv-stage-${activePlacement} ${className}`}>
      {/* 3D Realistic Plate / Platter Staging */}
      {activePlacement !== 'none' && (
        <div className={`mv-platter mv-platter-${activePlacement}`} aria-hidden="true">
          <div className="mv-platter-rim" />
          <div className="mv-platter-surface" />
          <div className="mv-platter-shadow" />
        </div>
      )}

      {ready && createElement('model-viewer', attrs)}

      {!loaded && !failed && (
        <div className="mv-status" role="status">
          <Loader2 className="spin" size={18} />
          <span>Plating 3D dish…</span>
        </div>
      )}

      {failed && (
        <div className="mv-status mv-failed" role="alert">
          This 3D model could not be loaded. Export your model as a GLB file and try again.
        </div>
      )}

      {loaded && showControls && (
        <div className="mv-overlay-controls" aria-label="3D Controls">
          <button
            type="button"
            className="mv-ctrl-btn"
            title={isRotating ? 'Pause rotation' : 'Start rotation'}
            onClick={() => setIsRotating(!isRotating)}
          >
            {isRotating ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            className="mv-ctrl-btn"
            title="Reset viewing angle"
            onClick={resetCamera}
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="mv-ctrl-btn"
            title="Zoom in"
            onClick={() => zoom('in')}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="mv-ctrl-btn"
            title="Zoom out"
            onClick={() => zoom('out')}
          >
            <ZoomOut size={14} />
          </button>
        </div>
      )}
    </div>
  );
});
