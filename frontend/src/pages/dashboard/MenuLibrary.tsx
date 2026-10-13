import { useEffect, useMemo, useState } from 'react';
import { Box, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { api, assetUrl, Item } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money, sortCategories } from '../../lib/format';
import { navigate, useLocation } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, IconButton, Photo, Select, Spinner } from '../../components/ui';
import { PageHeader } from './Shell';
import { useMenu } from './menuStore';
import { DishEditor, toInput } from './DishEditor';

type Filter = 'all' | 'with3d' | 'without3d' | 'hidden' | 'soldout';

export function MenuLibrary() {
  const { restaurant } = useAuth();
  const menu = useMenu();
  const toast = useToast();
  const { search } = useLocation();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<{ open: boolean; item: Item | null }>({ open: false, item: null });
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  // "/app/menu?new=1" opens the editor straight away (used by "Add a dish" buttons elsewhere).
  useEffect(() => {
    if (search.get('new')) {
      setEditor({ open: true, item: null });
      navigate('/app/menu', { replace: true });
    }
  }, [search]);

  const categories = useMemo(() => sortCategories(menu.items.map((i) => i.category)), [menu.items]);
  const list = useMemo(
    () =>
      menu.items.filter((d) => {
        if (cat !== 'All' && d.category !== cat) return false;
        if (q && !`${d.name} ${d.description ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
        switch (filter) {
          case 'with3d': return Boolean(d.modelUrl);
          case 'without3d': return !d.modelUrl;
          case 'hidden': return !d.published;
          case 'soldout': return !d.available;
          default: return true;
        }
      }),
    [menu.items, cat, q, filter]
  );

  if (!restaurant) return null;

  async function toggle(item: Item, change: { published?: boolean; available?: boolean }) {
    try {
      menu.upsert(await api.updateItem(item.id, toInput(item, change)));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteItem(toDelete.id);
      menu.remove(toDelete.id);
      toast.success(`Deleted ${toDelete.name}.`);
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={menu.status === 'ready' ? `${menu.items.length} ${menu.items.length === 1 ? 'dish' : 'dishes'}, ${menu.items.filter((i) => i.modelUrl).length} with 3D` : undefined}
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditor({ open: true, item: null })}>Add a dish</Button>}
      />

      {menu.status === 'loading' && <Spinner label="Loading your dishes" />}
      {menu.status === 'error' && <ErrorState message={menu.error} onRetry={menu.reload} />}

      {menu.status === 'ready' && menu.items.length === 0 && (
        <section className="panel">
          <EmptyState title="No dishes yet" text="Add a dish with a name, price and photo. You can attach a 3D model afterwards."
            action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditor({ open: true, item: null })}>Add your first dish</Button>} />
        </section>
      )}

      {menu.status === 'ready' && menu.items.length > 0 && (
        <>
          <div className="toolbar">
            <label className="search">
              <Search size={16} aria-hidden />
              <input type="search" placeholder="Search dishes" aria-label="Search dishes" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <Select aria-label="Filter dishes" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All dishes</option>
              <option value="with3d">Has 3D model</option>
              <option value="without3d">No 3D model yet</option>
              <option value="hidden">Hidden from guests</option>
              <option value="soldout">Sold out</option>
            </Select>
          </div>
          <div className="cat-tabs" role="group" aria-label="Category">
            {['All', ...categories].map((c) => (
              <button key={c} aria-pressed={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                {c}
                <span>{c === 'All' ? menu.items.length : menu.items.filter((i) => i.category === c).length}</span>
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <section className="panel"><EmptyState title="No dishes match" text="Try a different search or filter."
              action={<Button onClick={() => { setQ(''); setCat('All'); setFilter('all'); }}>Clear filters</Button>} /></section>
          ) : (
            <div className="dish-grid">
              {list.map((d) => (
                <article key={d.id} className={`dish ${d.published ? '' : 'is-hidden'}`}>
                  <div className="dish-img">
                    <Photo src={assetUrl(d.imageUrl)} alt="" />
                    <div className="dish-badges">
                      {d.modelUrl && <Chip tone="saffron" icon={<Box size={12} />}>3D</Chip>}
                      {d.featured && <Chip tone="cobalt" icon={<Star size={12} />}>Featured</Chip>}
                      {!d.published && <Chip>Hidden</Chip>}
                      {!d.available && <Chip tone="chili">Sold out</Chip>}
                    </div>
                  </div>
                  <div className="dish-body">
                    <div className="dish-title">
                      <h3>{d.name}</h3>
                      <b>{money(d.price, restaurant.currency)}</b>
                    </div>
                    <p className="dish-cat">{d.category}</p>
                    <div className="dish-actions">
                      <Button size="sm" icon={<Pencil size={14} />} onClick={() => setEditor({ open: true, item: d })}>Edit</Button>
                      <Button size="sm" icon={<Box size={14} />} onClick={() => navigate(`/app/studio?dish=${d.id}`)}>{d.modelUrl ? 'Manage 3D' : 'Add 3D'}</Button>
                      <span className="spacer" />
                      <IconButton label={d.published ? `Hide ${d.name} from guests` : `Show ${d.name} to guests`} onClick={() => toggle(d, { published: !d.published })}>
                        {d.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </IconButton>
                      <IconButton label={`Delete ${d.name}`} className="danger" onClick={() => setToDelete(d)}><Trash2 size={16} /></IconButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <DishEditor
        open={editor.open}
        item={editor.item}
        categories={categories}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={menu.upsert}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name ?? 'this dish'}?`}
        message="The dish, its photo and its 3D model will be removed for good. To keep it but hide it from guests, use the eye button instead."
        confirmLabel="Delete dish"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
