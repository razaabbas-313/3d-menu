import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Globe, ImagePlus, Trash2, X } from 'lucide-react';
import { api, assetUrl, Item, ItemInput } from '../../lib/api';
import { DEFAULT_CATEGORIES, parseTags } from '../../lib/format';
import { navigate } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, Chip, Dialog, DialogHeader, Field, Input, Photo, Progress, Switch, Textarea } from '../../components/ui';

const TAG_PRESETS = ['Halal', 'Vegetarian', 'Vegan', 'Spicy', 'Gluten-free', 'Nut-free'];

export const toInput = (item: Item, overrides: Partial<ItemInput> = {}): ItemInput => ({
  name: item.name,
  category: item.category,
  description: item.description ?? '',
  price: item.price,
  tags: item.tags ?? '',
  featured: item.featured,
  available: item.available,
  published: item.published,
  imageUrl: item.imageUrl,
  modelScale: item.modelScale ?? 1.0,
  modelPlacement: item.modelPlacement ?? 'plate',
  nameUr: item.nameUr ?? null,
  descriptionUr: item.descriptionUr ?? null,
  nameAr: item.nameAr ?? null,
  descriptionAr: item.descriptionAr ?? null,
  ...overrides
});

type Props = { open: boolean; item: Item | null; categories: string[]; onClose: () => void; onSaved: (item: Item) => void };

export function DishEditor({ open, item, categories, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onClose={onClose} variant="drawer" label={item ? `Edit ${item.name}` : 'Add a dish'}>
      <EditorForm item={item} categories={categories} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function EditorForm({ item, categories, onClose, onSaved }: Omit<Props, 'open'>) {
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [category, setCategory] = useState(item?.category ?? categories[0] ?? 'Mains');
  const [description, setDescription] = useState(item?.description ?? '');
  const [tags, setTags] = useState<string[]>(parseTags(item?.tags));
  const [tagDraft, setTagDraft] = useState('');
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [published, setPublished] = useState(item?.published ?? true);
  const [nameUr, setNameUr] = useState(item?.nameUr ?? '');
  const [descriptionUr, setDescriptionUr] = useState(item?.descriptionUr ?? '');
  const [nameAr, setNameAr] = useState(item?.nameAr ?? '');
  const [descriptionAr, setDescriptionAr] = useState(item?.descriptionAr ?? '');
  const [showTranslations, setShowTranslations] = useState(Boolean(item?.nameUr || item?.nameAr));
  const [modelWarning, setModelWarning] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [removeModel, setRemoveModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelProgress, setModelProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : removePhoto ? null : assetUrl(item?.imageUrl) ?? null), [file, removePhoto, item]);
  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const allCategories = useMemo(() => [...new Set([...categories, ...DEFAULT_CATEGORIES])], [categories]);
  const tagOptions = [...new Set([...TAG_PRESETS, ...tags])];

  const toggleTag = (t: string) => setTags((cur) => (cur.some((x) => x.toLowerCase() === t.toLowerCase()) ? cur.filter((x) => x.toLowerCase() !== t.toLowerCase()) : cur.length >= 8 ? cur : [...cur, t]));

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setError('Choose a JPG, PNG or WebP photo.');
    if (f.size > 6 * 1024 * 1024) return setError('That photo is larger than 6 MB. Choose a smaller one.');
    setError('');
    setFile(f);
    setRemovePhoto(false);
  }

  function pickModel(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.glb')) return setError('Choose a 3D model in .glb format.');
    if (f.size > 25 * 1024 * 1024) return setError('3D model exceeds 25 MB. Choose a smaller one.');
    setError('');
    if (f.size > 15 * 1024 * 1024) {
      setModelWarning('Notice: This 3D model is over 15 MB. We recommend compressing with gltf-transform (Draco/KTX2) so mobile diners load it in under a second.');
    } else {
      setModelWarning('');
    }
    setModelFile(f);
    setRemoveModel(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const numeric = Number(price);
    if (!name.trim()) return setError('Give the dish a name.');
    if (price.trim() === '' || !Number.isFinite(numeric) || numeric < 0) return setError('Enter a price of 0 or more.');
    if (!category.trim()) return setError('Choose or type a category.');
    setError('');
    setSaving(true);

    const payload: ItemInput = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: numeric,
      tags: tags.join(','),
      featured,
      available,
      published,
      imageUrl: removePhoto ? null : item?.imageUrl ?? null,
      modelScale: item?.modelScale ?? 1.0,
      modelPlacement: item?.modelPlacement ?? 'plate',
      nameUr: nameUr.trim() || null,
      descriptionUr: descriptionUr.trim() || null,
      nameAr: nameAr.trim() || null,
      descriptionAr: descriptionAr.trim() || null
    };

    let saved: Item;
    try {
      saved = item ? await api.updateItem(item.id, payload) : await api.createItem(payload);
    } catch (err) {
      setError(errorMessage(err, 'Could not save the dish.'));
      setSaving(false);
      return;
    }

    if (file) {
      try {
        saved = await api.uploadImage(saved.id, file, setProgress);
      } catch (err) {
        toast.error(`The dish was saved, but its photo was not: ${errorMessage(err)}`);
      }
    }

    if (removeModel && item?.modelUrl && !modelFile) {
      try {
        saved = await api.removeModel(saved.id);
      } catch {
        // ignore
      }
    }

    if (modelFile) {
      try {
        saved = await api.uploadModel(saved.id, modelFile, setModelProgress);
      } catch (err) {
        toast.error(`The dish was saved, but its 3D model failed to attach: ${errorMessage(err)}`);
      }
    }

    onSaved(saved);
    toast.success(item ? `Saved changes to ${saved.name}.` : `Added ${saved.name} to your menu.`);
    setSaving(false);
    onClose();
  }

  return (
    <form className="drawer-form" onSubmit={submit} noValidate>
      <DialogHeader title={item ? 'Edit dish' : 'Add a dish'} subtitle="Manage photo, pricing, and 3D augmented reality model." onClose={onClose} />
      <div className="drawer-body">
        <div className="photo-pick">
          <div className="photo-frame">
            <Photo src={preview} />
          </div>
          <div className="photo-actions">
            <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            <Button size="sm" icon={<ImagePlus size={15} />} onClick={() => fileInput.current?.click()}>{preview ? 'Replace photo' : 'Add photo'}</Button>
            {preview && <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => { setFile(null); setRemovePhoto(true); }}>Remove</Button>}
            <span className="field-hint">JPG, PNG or WebP, up to 6 MB. A bright, top-down photo works best.</span>
          </div>
        </div>

        <div className="model-pick" style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>3D AR Model (.glb)</label>
            {(modelFile || (!removeModel && item?.modelUrl)) && (
              <Chip tone="saffron" icon={<Box size={12} />}>3D Attached</Chip>
            )}
          </div>
          <div className="model-pick-actions">
            <input ref={modelInput} type="file" hidden accept=".glb,model/gltf-binary" onChange={(e) => { pickModel(e.target.files?.[0]); e.target.value = ''; }} />
            <Button size="sm" type="button" icon={<Box size={14} />} onClick={() => modelInput.current?.click()}>
              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {modelFile ? modelFile.name : (!removeModel && item?.modelFileName) || (!removeModel && item?.modelUrl ? 'Replace .glb model' : 'Attach 3D model (.glb)')}
              </span>
            </Button>
            {(modelFile || (!removeModel && item?.modelUrl)) && (
              <Button size="sm" variant="ghost" type="button" icon={<Trash2 size={14} />} onClick={() => { setModelFile(null); setRemoveModel(true); }}>
                Remove 3D
              </Button>
            )}
            {item?.modelUrl && !modelFile && !removeModel && (
              <Button size="sm" variant="ghost" type="button" onClick={() => { onClose(); navigate(`/app/studio?dish=${item.id}`); }}>
                Open 3D Studio
              </Button>
            )}
          </div>

          {modelWarning && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', color: '#facc15', fontSize: '12px', lineHeight: 1.4 }}>
              {modelWarning}
            </div>
          )}
          <span className="field-hint" style={{ margin: 0 }}>
            Upload a .glb 3D asset (up to 25 MB). Guests can view it in 3D and project it life-size on their table in AR.
          </span>
        </div>

        <Field label="Dish name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={140} placeholder="The Truffle Royale" autoFocus /></Field>
        <div className="form-row">
          <Field label="Price"><Input type="number" inputMode="decimal" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2450" /></Field>
          <Field label="Category">
            <Input list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="Mains" />
            <datalist id="category-options">{allCategories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="Description" hint={`${description.length}/700`}>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 700))} placeholder="Dry-aged beef, black truffle cream, toasted brioche." />
        </Field>

        {/* Multi-language translations (Urdu & Arabic) */}
        <div style={{ margin: '6px 0 14px 0', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowTranslations(!showTranslations)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--ink)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={15} style={{ color: 'var(--accent)' }} />
              <span>Multi-Language Translations (Urdu & Arabic)</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{showTranslations ? '▲ Hide' : '▼ Add / Edit'}</span>
          </button>
          {showTranslations && (
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--line)', display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <Field label="Urdu Name (نام)" hint="RTL">
                  <Input dir="rtl" value={nameUr} onChange={(e) => setNameUr(e.target.value)} maxLength={140} placeholder="دی ٹرفل رائل" />
                </Field>
                <Field label="Urdu Description (تفصیل)" hint="RTL">
                  <Textarea dir="rtl" rows={2} value={descriptionUr} onChange={(e) => setDescriptionUr(e.target.value.slice(0, 700))} placeholder="خشک بیف، بلیک ٹرفل کریم، چیڈر چیز..." />
                </Field>
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                <Field label="Arabic Name (الاسم بالعربية)" hint="RTL">
                  <Input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} maxLength={140} placeholder="ذا ترافل رويال" />
                </Field>
                <Field label="Arabic Description (الوصف بالعربية)" hint="RTL">
                  <Textarea dir="rtl" rows={2} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value.slice(0, 700))} placeholder="لحم بقري معتق، كريمة الترافل الأسود..." />
                </Field>
              </div>
            </div>
          )}
        </div>

        <fieldset className="tag-field">
          <legend>Labels</legend>
          <div className="tag-list">
            {tagOptions.map((t) => {
              const on = tags.some((x) => x.toLowerCase() === t.toLowerCase());
              return <button type="button" key={t} aria-pressed={on} className={`tag ${on ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}{on && !TAG_PRESETS.includes(t) && <X size={12} />}</button>;
            })}
          </div>
          <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add your own label and press Enter" maxLength={24}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = tagDraft.trim().replace(/,/g, ''); if (t) { toggleTag(t); setTagDraft(''); } } }} />
        </fieldset>

        <div className="switches">
          <Switch checked={published} onChange={setPublished} label="Show on the guest menu" description="Turn off to hide this dish without deleting it." />
          <Switch checked={available} onChange={setAvailable} label="Available today" description="When off, guests see it marked as sold out." />
          <Switch checked={featured} onChange={setFeatured} label="Feature at the top" description="Featured dishes appear first on the guest menu." />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <div className="drawer-foot">
        {saving && ((file && progress > 0 && progress < 1) || (modelFile && modelProgress > 0 && modelProgress < 1)) ? (
          <Progress value={Math.max(progress, modelProgress)} />
        ) : <span />}
        <div className="actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>{item ? 'Save changes' : 'Add dish'}</Button>
        </div>
      </div>
    </form>
  );
}
