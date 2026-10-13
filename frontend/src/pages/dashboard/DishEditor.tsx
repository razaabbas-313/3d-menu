import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { api, assetUrl, Item, ItemInput } from '../../lib/api';
import { DEFAULT_CATEGORIES, parseTags } from '../../lib/format';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, Dialog, DialogHeader, Field, Input, Photo, Progress, Switch, Textarea } from '../../components/ui';

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
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

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
      modelPlacement: item?.modelPlacement ?? 'plate'
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
        onSaved(saved);
        toast.error(`The dish was saved, but its photo was not: ${errorMessage(err)}`);
        setSaving(false);
        onClose();
        return;
      }
    }
    onSaved(saved);
    toast.success(item ? `Saved changes to ${saved.name}.` : `Added ${saved.name} to your menu.`);
    setSaving(false);
    onClose();
  }

  return (
    <form className="drawer-form" onSubmit={submit} noValidate>
      <DialogHeader title={item ? 'Edit dish' : 'Add a dish'} subtitle={item ? undefined : 'You can attach a 3D model after saving.'} onClose={onClose} />
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
        {saving && file && progress > 0 && progress < 1 ? <Progress value={progress} /> : <span />}
        <div className="actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>{item ? 'Save changes' : 'Add dish'}</Button>
        </div>
      </div>
    </form>
  );
}
