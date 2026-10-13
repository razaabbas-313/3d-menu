import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Check, Smartphone, Trash2, Upload } from 'lucide-react';
import { api, assetUrl, Item, publicMenuUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import { navigate, useLocation } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, ButtonLink, Chip, ConfirmDialog, EmptyState, Photo, Progress, Spinner } from '../../components/ui';
import { ModelViewer, ModelViewerHandle } from '../../components/ModelViewer';
import { QrCode } from '../../components/QrCode';
import { PageHeader } from './Shell';
import { useMenu } from './menuStore';

const MAX_BYTES = 25 * 1024 * 1024;

export function Studio() {
  const { restaurant } = useAuth();
  const menu = useMenu();
  const toast = useToast();
  const { search } = useLocation();
  const [selectedId, setSelectedId] = useState<string>(search.get('dish') ?? '');
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingTuning, setSavingTuning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const viewer = useRef<ModelViewerHandle>(null);

  const items = menu.items;
  const dish: Item | undefined = items.find((i) => i.id === selectedId) ?? items[0];

  const [currentScale, setCurrentScale] = useState<number>(dish?.modelScale ?? 1.0);
  const [currentPlacement, setCurrentPlacement] = useState<string>(dish?.modelPlacement ?? 'plate');

  useEffect(() => {
    if (dish) {
      setCurrentScale(dish.modelScale ?? 1.0);
      setCurrentPlacement(dish.modelPlacement ?? 'plate');
    }
  }, [dish?.id, dish?.modelScale, dish?.modelPlacement]);

  const isTuningDirty = Boolean(
    dish &&
      (Math.abs((dish.modelScale ?? 1.0) - currentScale) > 0.02 ||
        (dish.modelPlacement ?? 'plate') !== currentPlacement)
  );

  async function saveTuning() {
    if (!dish) return;
    setSavingTuning(true);
    try {
      const updated = await api.tuneModel(dish.id, currentScale, currentPlacement);
      menu.upsert(updated);
      toast.success('3D plating & scale saved.');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save 3D settings.'));
    } finally {
      setSavingTuning(false);
    }
  }

  // Keep the URL in sync so the page can be bookmarked or linked from the menu list.
  useEffect(() => {
    if (dish && dish.id !== search.get('dish')) navigate(`/app/studio?dish=${dish.id}`, { replace: true });
  }, [dish, search]);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  if (!restaurant) return null;
  if (menu.status === 'loading') return <Spinner label="Loading your dishes" />;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="3D studio" subtitle="Attach 3D models to your dishes." />
        <section className="panel">
          <EmptyState title="Add a dish first" text="3D models are attached to dishes on your menu."
            action={<ButtonLink to="/app/menu?new=1" variant="primary">Add a dish</ButtonLink>} />
        </section>
      </>
    );
  }
  if (!dish) return null;

  async function upload(file: File | undefined) {
    if (!file || !dish) return;
    if (!/\.glb$/i.test(file.name)) {
      toast.error('Please choose a .glb file. In Blender, Sketchfab or Polycam, export as "glTF Binary (.glb)".');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 25 MB. Reduce texture sizes and export again.`);
      return;
    }
    setProgress(0);
    try {
      menu.upsert(await api.uploadModel(dish.id, file, setProgress));
      toast.success(`3D model attached to ${dish.name}.`);
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed.'));
    } finally {
      setProgress(null);
    }
  }

  async function removeModel() {
    if (!dish) return;
    setRemoving(true);
    try {
      menu.upsert(await api.removeModel(dish.id));
      toast.success('3D model removed.');
      setConfirmRemove(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(false);
    }
  }

  function testAr() {
    if (viewer.current?.canActivateAR) viewer.current.activateAR();
    else toast.info('AR opens on a phone or tablet. Scan the QR code below with your phone to try it.');
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void upload(e.dataTransfer.files[0]);
  };
  const phoneLink = `${publicMenuUrl(restaurant.slug)}?dish=${dish.id}`;
  const uploading = progress !== null;

  return (
    <>
      <PageHeader title="3D studio" subtitle="Upload a model, check how it looks, and test it in AR." />
      <div className="studio">
        <section className="panel studio-list" aria-label="Dishes">
          <div className="panel-head tight">
            <h2>Dishes</h2>
            <span className="muted">{items.filter((i) => i.modelUrl).length} with 3D</span>
          </div>
          {items.length > 7 && <input className="input" type="search" placeholder="Search dishes" aria-label="Search dishes" value={q} onChange={(e) => setQ(e.target.value)} />}
          <ul>
            {filtered.map((i) => (
              <li key={i.id}>
                <button className={`pick ${i.id === dish.id ? 'on' : ''}`} aria-pressed={i.id === dish.id} onClick={() => setSelectedId(i.id)}>
                  <span className="pick-thumb"><Photo src={assetUrl(i.imageUrl)} alt="" /></span>
                  <span className="pick-text">
                    <strong>{i.name}</strong>
                    <small>{i.modelUrl ? '3D model attached' : 'Photo only'}</small>
                  </span>
                  {i.modelUrl && <Check size={16} className="pick-check" aria-label="Has 3D model" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="muted">No dishes match.</li>}
          </ul>
        </section>

        <section className="studio-main">
          <div className="panel stage-panel">
            <div className="panel-head tight">
              <div>
                <h2>{dish.name}</h2>
                <p className="muted">{money(dish.price, restaurant.currency)} · {dish.category}</p>
              </div>
              <Chip tone={dish.modelUrl ? 'basil' : 'neutral'}>{dish.modelUrl ? 'Model attached' : 'No model yet'}</Chip>
            </div>

            <div className="stage">
              <div className="stage-floor" aria-hidden />
              {dish.modelUrl ? (
                <ModelViewer
                  ref={viewer}
                  className="stage-model"
                  src={assetUrl(dish.modelUrl)!}
                  alt={`3D model of ${dish.name}`}
                  scale={currentScale}
                  placement={currentPlacement}
                  poster={undefined}
                />
              ) : (
                <div className="stage-photo">
                  <Photo src={assetUrl(dish.imageUrl)} alt={dish.name} />
                  <p>Photo only. Upload a .glb to make it spin.</p>
                </div>
              )}
            </div>

            <input ref={input} type="file" hidden accept=".glb,model/gltf-binary" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />

            {dish.modelUrl ? (
              <>
                <div className="stage-actions">
                  <div className="file-name">
                    <Box size={16} />
                    <span>{dish.modelFileName ?? 'model.glb'}</span>
                  </div>
                  <div className="actions">
                    <Button size="sm" icon={<Smartphone size={15} />} onClick={testAr}>Test AR</Button>
                    <Button size="sm" icon={<Upload size={15} />} onClick={() => input.current?.click()} disabled={uploading}>Replace</Button>
                    <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)}>Remove</Button>
                  </div>
                </div>

                {/* 3D Model Tuning: Plate Surface & Scale */}
                <div className="tuning-section">
                  <div className="tuning-head">
                    <div>
                      <strong>Plate & 3D Staging</strong>
                      <p className="field-hint">Position the dish on a serving plate and adjust the scale so it looks natural in AR.</p>
                    </div>
                    {isTuningDirty && (
                      <Button size="sm" variant="primary" loading={savingTuning} onClick={saveTuning}>Save 3D staging</Button>
                    )}
                  </div>

                  <div className="tuning-grid">
                    <div className="tuning-field">
                      <label className="field-label">Serving plate style</label>
                      <div className="plate-options">
                        {[
                          { id: 'plate', label: 'Porcelain Plate', icon: '🍽️' },
                          { id: 'slate', label: 'Dark Slate', icon: '⬛' },
                          { id: 'marble', label: 'Marble Board', icon: '⚪' },
                          { id: 'wood', label: 'Wood Platter', icon: '🪵' },
                          { id: 'none', label: 'No Plate', icon: '✨' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`plate-opt ${currentPlacement === p.id ? 'active' : ''}`}
                            onClick={() => setCurrentPlacement(p.id)}
                          >
                            <span className="plate-opt-icon">{p.icon}</span>
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="tuning-field">
                      <div className="scale-head">
                        <label className="field-label">Model scale</label>
                        <span className="scale-val">{Number(currentScale).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.5"
                        step="0.05"
                        value={currentScale}
                        onChange={(e) => setCurrentScale(parseFloat(e.target.value))}
                        className="scale-slider"
                      />
                      <div className="scale-presets">
                        {[
                          { val: 0.75, label: 'Petite (0.75x)' },
                          { val: 1.0, label: 'Standard (1.0x)' },
                          { val: 1.25, label: 'Gourmet (1.25x)' },
                          { val: 1.5, label: 'Grand (1.5x)' }
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            className={`scale-preset-btn ${Math.abs(currentScale - preset.val) < 0.03 ? 'on' : ''}`}
                            onClick={() => setCurrentScale(preset.val)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div
                className={`dropzone ${drag ? 'drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <Upload size={22} />
                <p><strong>Drop a .glb file here</strong> or</p>
                <Button variant="primary" onClick={() => input.current?.click()} disabled={uploading}>Choose file</Button>
                <small>GLB (glTF binary) only · up to 25 MB</small>
              </div>
            )}
            {uploading && (
              <div className="upload-state" role="status">
                <span>{progress! < 1 ? 'Uploading model' : 'Processing'}</span>
                <Progress value={progress!} />
              </div>
            )}
          </div>

          <div className="studio-aside">
            <section className="panel phone-test">
              <h2>Try it on your phone</h2>
              {restaurant.published ? (
                <>
                  <p className="muted">Scan to open this dish in your live menu, then tap “View on your table”.</p>
                  <QrCode value={phoneLink} size={132} />
                </>
              ) : (
                <>
                  <p className="muted">AR works from the public menu link on a phone. Publish your menu to get a link you can open.</p>
                  <ButtonLink to="/app/share" size="sm">Go to sharing</ButtonLink>
                </>
              )}
            </section>
            <section className="panel tips">
              <h2>Getting a good model</h2>
              <ul>
                <li>Export as <b>GLB</b>. It bundles textures into one file.</li>
                <li>Keep it under <b>25 MB</b>. Textures of 1024 to 2048 px are plenty.</li>
                <li>Adjust the <b>Scale</b> and <b>Plate Style</b> above so the food sits appetizingly on table surface.</li>
                <li>Apps like Polycam or Luma can scan a dish with a phone and export GLB.</li>
              </ul>
            </section>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this 3D model?"
        message={`${dish.name} will go back to a photo-only dish. You can upload a model again at any time.`}
        confirmLabel="Remove model"
        busy={removing}
        onConfirm={removeModel}
        onClose={() => setConfirmRemove(false)}
      />
    </>
  );
}
