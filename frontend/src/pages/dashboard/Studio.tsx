import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  Trash2,
  Upload
} from 'lucide-react';
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

const MAX_BYTES = 50 * 1024 * 1024;

type FilterType = 'all' | '3d' | 'photo';

export function Studio() {
  const { restaurant } = useAuth();
  const menu = useMenu();
  const toast = useToast();
  const { search } = useLocation();
  const [selectedId, setSelectedId] = useState<string>(search.get('dish') ?? '');
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingScale, setSavingScale] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const viewer = useRef<ModelViewerHandle>(null);

  const items = menu.items;
  const dish: Item | undefined = items.find((i) => i.id === selectedId) ?? items[0];

  const [currentScale, setCurrentScale] = useState<number>(dish?.modelScale ?? 1.0);

  useEffect(() => {
    if (dish) {
      setCurrentScale(dish.modelScale ?? 1.0);
    }
  }, [dish?.id, dish?.modelScale]);

  const isScaleDirty = Boolean(
    dish && Math.abs((dish.modelScale ?? 1.0) - currentScale) > 0.02
  );

  async function saveScale() {
    if (!dish) return;
    setSavingScale(true);
    try {
      const updated = await api.tuneModel(dish.id, currentScale, dish.modelPlacement ?? 'none');
      menu.upsert(updated);
      toast.success('3D model scale saved.');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save scale.'));
    } finally {
      setSavingScale(false);
    }
  }

  // Keep URL in sync
  useEffect(() => {
    if (dish && dish.id !== search.get('dish')) {
      navigate(`/app/studio?dish=${dish.id}`, { replace: true });
    }
  }, [dish, search]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch =
        i.name.toLowerCase().includes(q.toLowerCase()) ||
        i.category.toLowerCase().includes(q.toLowerCase());
      if (!matchSearch) return false;
      if (filterType === '3d') return Boolean(i.modelUrl);
      if (filterType === 'photo') return !i.modelUrl;
      return true;
    });
  }, [items, q, filterType]);

  const count3D = useMemo(() => items.filter((i) => i.modelUrl).length, [items]);
  const countPhoto = items.length - count3D;

  if (!restaurant) return null;
  if (menu.status === 'loading') return <Spinner label="Loading 3D studio…" />;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="3D Studio" subtitle="Attach 3D models to your dishes." />
        <section className="panel">
          <EmptyState
            title="Add a dish first"
            text="3D models are attached to dishes on your menu."
            action={<ButtonLink to="/app/menu?new=1" variant="primary">Add a dish</ButtonLink>}
          />
        </section>
      </>
    );
  }

  if (!dish) return null;

  async function upload(file: File | undefined) {
    if (!file || !dish) return;
    if (!/\.glb$/i.test(file.name)) {
      toast.error('Please choose a .glb file. Export as glTF Binary (.glb) from Polycam, Blender, or Sketchfab.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 50 MB. Optimize textures and try again.`
      );
      return;
    }
    setProgress(0);
    try {
      menu.upsert(await api.uploadModel(dish.id, file, setProgress));
      toast.success(`3D model attached to ${dish.name}!`);
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
    if (viewer.current?.canActivateAR) {
      viewer.current.activateAR();
    } else {
      toast.info('Scan the QR code with your phone or tablet camera to test AR on your dining table.');
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void upload(e.dataTransfer.files[0]);
  };

  const phoneLink = `${publicMenuUrl(restaurant.slug)}?dish=${dish.id}`;
  const uploading = progress !== null;

  const copyPhoneLink = () => {
    void navigator.clipboard.writeText(phoneLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
    toast.success('AR test link copied!');
  };

  return (
    <>
      <PageHeader
        title="3D Studio"
        subtitle="Manage 3D dish models, adjust life-size scale, and test in augmented reality."
        actions={
          <div className="studio-top-actions">
            {dish.modelUrl && (
              <Button
                variant="accent"
                size="sm"
                icon={<Smartphone size={15} />}
                onClick={testAr}
              >
                Launch AR
              </Button>
            )}
            <a
              href={phoneLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              title="Preview dish in guest menu"
            >
              <ExternalLink size={14} />
              <span>Preview Menu</span>
            </a>
          </div>
        }
      />

      <div className="studio-clean-layout">
        {/* Left: Dish Selector */}
        <aside className="panel studio-clean-sidebar" aria-label="Dishes">
          <div className="studio-clean-sidebar-head">
            <div className="studio-clean-sidebar-title">
              <h2>Dishes</h2>
              <span className="studio-clean-count">{count3D} in 3D</span>
            </div>

            <div className="studio-clean-filter-pills" role="tablist">
              <button
                type="button"
                className={`clean-pill ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                className={`clean-pill ${filterType === '3d' ? 'active' : ''}`}
                onClick={() => setFilterType('3d')}
              >
                3D ({count3D})
              </button>
              <button
                type="button"
                className={`clean-pill ${filterType === 'photo' ? 'active' : ''}`}
                onClick={() => setFilterType('photo')}
              >
                Photo ({countPhoto})
              </button>
            </div>
          </div>

          <div className="studio-clean-search">
            <input
              className="input studio-search-input"
              type="search"
              placeholder="Search dishes…"
              aria-label="Search dishes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <ul className="studio-clean-dish-list">
            {filtered.map((i) => {
              const isSelected = i.id === dish.id;
              return (
                <li key={i.id}>
                  <button
                    className={`clean-pick ${isSelected ? 'on' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(i.id)}
                  >
                    <span className="clean-pick-thumb">
                      <Photo src={assetUrl(i.imageUrl)} alt="" />
                      {i.modelUrl && <span className="clean-3d-tag">3D</span>}
                    </span>
                    <span className="clean-pick-info">
                      <strong className="clean-pick-name">{i.name}</strong>
                      <span className="clean-pick-sub">
                        {money(i.price, restaurant.currency)} · {i.category}
                      </span>
                    </span>
                    {i.modelUrl && (
                      <span className="clean-check-badge">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="clean-empty-hint">No dishes match.</li>}
          </ul>
        </aside>

        {/* Right / Main Workbench */}
        <main className="studio-clean-main">
          {/* Main 3D Stage Panel */}
          <section className="panel studio-clean-stage-panel">
            <div className="stage-panel-head">
              <div>
                <h2>{dish.name}</h2>
                <p className="muted">
                  {money(dish.price, restaurant.currency)} · {dish.category}
                </p>
              </div>

              <div className="stage-panel-actions">
                <Chip tone={dish.modelUrl ? 'basil' : 'neutral'}>
                  {dish.modelUrl ? '3D Active' : 'Photo Only'}
                </Chip>

                <input
                  ref={input}
                  type="file"
                  hidden
                  accept=".glb,model/gltf-binary"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                {dish.modelUrl ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Upload size={14} />}
                      onClick={() => input.current?.click()}
                      disabled={uploading}
                    >
                      Replace .glb
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setConfirmRemove(true)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Upload size={14} />}
                    onClick={() => input.current?.click()}
                    disabled={uploading}
                  >
                    Upload .glb
                  </Button>
                )}
              </div>
            </div>

            {/* 3D Model Stage (Clean Turntable without plates, angles, or ambiances) */}
            <div className="studio-clean-viewport">
              {dish.modelUrl ? (
                <ModelViewer
                  ref={viewer}
                  className="stage-model"
                  src={assetUrl(dish.modelUrl)!}
                  alt={`3D model of ${dish.name}`}
                  scale={currentScale}
                  placement="none"
                  showControls={true}
                />
              ) : (
                <div className="stage-photo-clean">
                  <div className="stage-photo-clean-img">
                    <Photo src={assetUrl(dish.imageUrl)} alt={dish.name} />
                  </div>
                  <p className="muted">No 3D model attached yet.</p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="clean-upload-state" role="status">
                <span>{progress! < 1 ? 'Uploading 3D model…' : 'Processing asset…'}</span>
                <Progress value={progress!} />
              </div>
            )}

            {/* Dropzone for Photo-only Dishes */}
            {!dish.modelUrl && (
              <div
                className={`clean-dropzone ${drag ? 'drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <Upload size={24} />
                <p>
                  <strong>Drop a .glb file here</strong> or
                </p>
                <Button variant="primary" onClick={() => input.current?.click()} disabled={uploading}>
                  Choose .glb file
                </Button>
                <small>GLB (glTF binary) up to 50 MB</small>
              </div>
            )}
          </section>

          {/* Bottom Dual Grid: Simple Scale Calibration & Phone AR Test */}
          <div className="studio-clean-bottom-grid">
            {/* Simple Scale Card (Only shown if dish has 3D model) */}
            {dish.modelUrl ? (
              <section className="panel clean-scale-card">
                <div className="clean-card-head">
                  <div>
                    <h3>Model Scale</h3>
                    <p className="muted">Calibrate life-size dimensions for augmented reality.</p>
                  </div>
                  <span className="scale-num-badge">{Number(currentScale).toFixed(2)}x</span>
                </div>

                <div className="clean-scale-slider-wrap">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={currentScale}
                    onChange={(e) => setCurrentScale(parseFloat(e.target.value))}
                    className="clean-scale-slider"
                  />
                </div>

                <div className="clean-scale-presets">
                  {[
                    { val: 0.75, label: '0.75x (Petite)' },
                    { val: 1.0, label: '1.00x (Standard)' },
                    { val: 1.25, label: '1.25x (Gourmet)' },
                    { val: 1.5, label: '1.50x (Sharing)' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      className={`clean-scale-preset-btn ${
                        Math.abs(currentScale - p.val) < 0.03 ? 'active' : ''
                      }`}
                      onClick={() => setCurrentScale(p.val)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {isScaleDirty && (
                  <div className="clean-scale-save-row">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={savingScale}
                      onClick={saveScale}
                    >
                      Save Scale
                    </Button>
                  </div>
                )}
              </section>
            ) : null}

            {/* Test on Phone Card */}
            <section className="panel clean-phone-card">
              <div className="clean-card-head">
                <div>
                  <h3>Test on Your Phone</h3>
                  <p className="muted">Point your phone camera to test AR on a real table.</p>
                </div>
              </div>

              {restaurant.published ? (
                <div className="clean-phone-body">
                  <div className="clean-qr-frame">
                    <QrCode value={phoneLink} size={130} />
                  </div>
                  <div className="clean-phone-actions">
                    <Button
                      size="sm"
                      variant={copiedLink ? 'primary' : 'secondary'}
                      icon={copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      onClick={copyPhoneLink}
                    >
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <a
                      href={phoneLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      Open Live Link ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="clean-unpub-box">
                  <p className="muted">
                    AR requires a public link. Publish your menu to test on phones.
                  </p>
                  <ButtonLink to="/app/share" size="sm" variant="accent">
                    Publish & Share
                  </ButtonLink>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this 3D model?"
        message={`"${dish.name}" will revert to a photo-only dish. You can upload a 3D model again at any time.`}
        confirmLabel="Remove model"
        busy={removing}
        onConfirm={removeModel}
        onClose={() => setConfirmRemove(false)}
      />
    </>
  );
}
