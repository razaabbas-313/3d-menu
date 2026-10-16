import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Box, Eye, EyeOff, FolderPlus, Layers, Pencil, Plus, Search, SlidersHorizontal, Star, Trash2, X } from 'lucide-react';
import { api, assetUrl, Item } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money, parseTags } from '../../lib/format';
import { navigate, useLocation } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, Chip, ConfirmDialog, CustomSelect, Dialog, DialogHeader, EmptyState, ErrorState, Field, IconButton, Input, Photo, SelectOption, Spinner } from '../../components/ui';
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

  // Category management modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [catDeleting, setCatDeleting] = useState(false);

  const filterOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'All dishes', badge: menu.items.length },
    { value: 'with3d', label: 'Has 3D model', icon: <Box size={14} />, badge: menu.items.filter((i) => i.modelUrl).length },
    { value: 'without3d', label: 'Photo only', badge: menu.items.filter((i) => !i.modelUrl).length },
    { value: 'hidden', label: 'Hidden from guests', icon: <EyeOff size={14} />, badge: menu.items.filter((i) => !i.published).length },
    { value: 'soldout', label: 'Sold out', badge: menu.items.filter((i) => !i.available).length },
  ], [menu.items]);

  // "/app/menu?new=1" opens the editor straight away (used by "Add a dish" buttons elsewhere).
  useEffect(() => {
    if (search.get('new')) {
      setEditor({ open: true, item: null });
      navigate('/app/menu', { replace: true });
    }
  }, [search]);

  const categories = menu.categories;

  const list = useMemo(
    () =>
      menu.items.filter((d) => {
        if (cat !== 'All' && d.category !== cat) return false;
        if (q && !`${d.name} ${d.description ?? ''} ${d.tags ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
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
      if (change.available !== undefined) {
        menu.upsert(await api.toggleAvailable(item.id, change.available));
      } else {
        menu.upsert(await api.updateItem(item.id, toInput(item, change)));
      }
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

  function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      toast.error('Enter a category name.');
      return;
    }
    const added = menu.addCategory(trimmed);
    if (added) {
      toast.success(`Added category "${trimmed}".`);
      setNewCatName('');
      setCat(trimmed);
    } else {
      toast.info(`Category "${trimmed}" already exists.`);
    }
  }

  async function confirmDeleteCategory() {
    if (!categoryToDelete) return;
    setCatDeleting(true);
    try {
      const fallback = categories.find((c) => c !== categoryToDelete) || 'Mains';
      await menu.removeCategory(categoryToDelete, fallback);
      toast.success(`Category "${categoryToDelete}" removed.`);
      if (cat === categoryToDelete) setCat('All');
      setCategoryToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCatDeleting(false);
    }
  }

  const with3dCount = menu.items.filter((i) => i.modelUrl).length;

  return (
    <>
      <PageHeader
        title="Menu Library"
        subtitle={menu.status === 'ready' ? `${menu.items.length} ${menu.items.length === 1 ? 'dish' : 'dishes'}, ${with3dCount} with interactive 3D` : undefined}
        actions={
          <div className="menu-header-actions">
            <Button
              variant="secondary"
              icon={<SlidersHorizontal size={15} />}
              onClick={() => setCategoryModalOpen(true)}
              className="btn-categories"
            >
              Categories
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setEditor({ open: true, item: null })}
            >
              Add a dish
            </Button>
          </div>
        }
      />

      {menu.status === 'loading' && <Spinner label="Loading your dishes" />}
      {menu.status === 'error' && <ErrorState message={menu.error} onRetry={menu.reload} />}

      {menu.status === 'ready' && menu.items.length === 0 && (
        <section className="panel">
          <EmptyState
            title="No dishes yet"
            text="Add a dish with a name, price, photo, and 3D augmented reality model to bring your menu to life."
            action={
              <div className="actions center">
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditor({ open: true, item: null })}>
                  Add your first dish
                </Button>
                <Button variant="secondary" icon={<FolderPlus size={16} />} onClick={() => setCategoryModalOpen(true)}>
                  Manage categories
                </Button>
              </div>
            }
          />
        </section>
      )}

      {menu.status === 'ready' && menu.items.length > 0 && (
        <>
          {/* Quick Stats Ribbon on Mobile */}
          <div className="menu-mobile-summary">
            <div className="summary-pill">
              <b>{menu.items.length}</b> <span>Total</span>
            </div>
            <div className="summary-pill saffron">
              <b>{with3dCount}</b> <span>in 3D</span>
            </div>
            <div className="summary-pill basil">
              <b>{menu.items.filter((i) => i.published).length}</b> <span>Live</span>
            </div>
            <div className="summary-pill neutral">
              <b>{categories.length}</b> <span>Categories</span>
            </div>
          </div>

          <div className="toolbar">
            <label className="search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                placeholder="Search by dish name, description, or tag…"
                aria-label="Search dishes"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setQ('')}
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="toolbar-select-wrap">
              <CustomSelect
                ariaLabel="Filter dishes"
                value={filter}
                onChange={(val) => setFilter(val as Filter)}
                options={filterOptions}
              />
            </div>
          </div>

          {/* Interactive Category Tabs with Quick Add */}
          <div className="cat-tabs-container">
            <div className="cat-tabs" role="group" aria-label="Category filter">
              <button
                type="button"
                aria-pressed={cat === 'All'}
                className={`cat-pill ${cat === 'All' ? 'on' : ''}`}
                onClick={() => setCat('All')}
              >
                All Dishes
                <span className="cat-count">{menu.items.length}</span>
              </button>

              {categories.map((c) => {
                const count = menu.items.filter((i) => i.category.toLowerCase() === c.toLowerCase()).length;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cat === c}
                    className={`cat-pill ${cat === c ? 'on' : ''}`}
                    onClick={() => setCat(c)}
                  >
                    {c}
                    <span className="cat-count">{count}</span>
                  </button>
                );
              })}

              {/* Add & Manage Category Buttons inside Tabs */}
              <button
                type="button"
                className="cat-pill cat-pill-action"
                onClick={() => setCategoryModalOpen(true)}
                title="Add or remove categories"
              >
                <Plus size={13} />
                <span>Category</span>
              </button>
            </div>
          </div>

          {list.length === 0 ? (
            <section className="panel">
              <EmptyState
                title="No dishes match your filter"
                text={cat !== 'All' ? `No dishes found in category "${cat}".` : 'Try clearing your search query or choosing another filter.'}
                action={
                  <div className="actions center">
                    <Button onClick={() => { setQ(''); setCat('All'); setFilter('all'); }}>Clear filters</Button>
                    <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditor({ open: true, item: null })}>Add a dish</Button>
                  </div>
                }
              />
            </section>
          ) : (
            <div className="dish-grid">
              {list.map((d) => {
                const dishTags = parseTags(d.tags);
                return (
                  <article key={d.id} className={`dish ${d.published ? '' : 'is-hidden'}`}>
                    <div className="dish-img">
                      <Photo src={assetUrl(d.thumbnailUrl || d.imageUrl)} alt={d.name} />
                      <div className="dish-badges">
                        {d.modelStatus === 'PROCESSING' ? (
                          <Chip tone="saffron" icon={<Box size={12} />}>3D Processing</Chip>
                        ) : d.modelUrl ? (
                          <Chip tone="saffron" icon={<Box size={12} />}>
                            3D Active{d.modelFileSize ? ` (${(d.modelFileSize / (1024 * 1024)).toFixed(1)}MB)` : ''}
                          </Chip>
                        ) : null}
                        {d.featured && <Chip tone="cobalt" icon={<Star size={12} />}>Featured</Chip>}
                        {!d.published && <Chip tone="neutral">Hidden</Chip>}
                        {!d.available && <Chip tone="chili">Sold Out</Chip>}
                      </div>
                    </div>
                    <div className="dish-body">
                      <div className="dish-header-row">
                        <span className="dish-cat-pill">{d.category}</span>
                        <b className="dish-price">{money(d.price, restaurant.currency)}</b>
                      </div>

                      <div className="dish-title">
                        <h3>{d.name}</h3>
                      </div>

                      {d.description && (
                        <p className="dish-desc">{d.description}</p>
                      )}

                      {dishTags.length > 0 && (
                        <div className="dish-tags-micro">
                          {dishTags.slice(0, 3).map((t) => (
                            <span key={t} className="micro-tag">{t}</span>
                          ))}
                          {dishTags.length > 3 && (
                            <span className="micro-tag">+{dishTags.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="dish-actions">
                        <Button
                          size="sm"
                          icon={<Pencil size={14} />}
                          onClick={() => setEditor({ open: true, item: d })}
                          className="btn-dish-edit"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={d.modelUrl ? 'secondary' : 'accent'}
                          icon={<Box size={14} />}
                          onClick={() => navigate(`/app/studio?dish=${d.id}`)}
                          className="btn-dish-3d"
                        >
                          {d.modelUrl ? '3D Studio' : '+ Add 3D'}
                        </Button>
                        <span className="spacer" />
                        <IconButton
                          label={d.published ? `Hide ${d.name} from guests` : `Show ${d.name} to guests`}
                          onClick={() => toggle(d, { published: !d.published })}
                          className="dish-icon-btn"
                        >
                          {d.published ? <Eye size={16} /> : <EyeOff size={16} />}
                        </IconButton>
                        <IconButton
                          label={`Delete ${d.name}`}
                          className="danger dish-icon-btn"
                          onClick={() => setToDelete(d)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dish Editor Drawer */}
      <DishEditor
        open={editor.open}
        item={editor.item}
        categories={categories}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={menu.upsert}
      />

      {/* Dish Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name ?? 'this dish'}?`}
        message="The dish, its photo, and attached 3D model will be permanently removed. To temporarily hide it from guests, click the eye icon instead."
        confirmLabel="Delete dish"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      {/* Category Manager Modal */}
      <Dialog
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        variant="modal"
        label="Manage Menu Categories"
      >
        <DialogHeader
          title="Menu Categories"
          subtitle="Add or delete sections to organize your dishes for diners."
          onClose={() => setCategoryModalOpen(false)}
        />
        <div className="dialog-pad category-manager-pad">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="category-add-form">
            <Field label="Add new category" hint="e.g. Signature Burgers, Artisan Cocktails, Desserts">
              <div className="category-add-row">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category title…"
                  maxLength={50}
                />
                <Button variant="primary" type="submit" icon={<Plus size={15} />}>
                  Add
                </Button>
              </div>
            </Field>
          </form>

          <hr className="divider" />

          {/* Existing Categories List */}
          <div className="category-list-header">
            <strong>Active Categories ({categories.length})</strong>
            <span className="muted">Dishes in deleted categories move to "Mains"</span>
          </div>

          <div className="category-items-list">
            {categories.map((c) => {
              const count = menu.items.filter((i) => i.category.toLowerCase() === c.toLowerCase()).length;
              return (
                <div key={c} className="category-item-row">
                  <div className="category-item-info">
                    <span className="category-item-icon"><Layers size={15} /></span>
                    <strong className="category-item-title">{c}</strong>
                    <span className="category-item-count">{count} {count === 1 ? 'dish' : 'dishes'}</span>
                  </div>
                  <IconButton
                    label={`Delete category "${c}"`}
                    className="danger"
                    onClick={() => setCategoryToDelete(c)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>

      {/* Category Deletion Confirmation */}
      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title={`Delete category "${categoryToDelete}"?`}
        message={
          categoryToDelete && menu.items.some((i) => i.category.toLowerCase() === categoryToDelete.toLowerCase())
            ? `There are currently ${menu.items.filter((i) => i.category.toLowerCase() === categoryToDelete.toLowerCase()).length} dishes in this category. They will be reassigned to "Mains".`
            : `Are you sure you want to remove "${categoryToDelete}"?`
        }
        confirmLabel="Remove category"
        busy={catDeleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />
    </>
  );
}
