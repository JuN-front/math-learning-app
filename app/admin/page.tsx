'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Users, BookOpen, Plus, Trash2, Edit, Upload, X,
  ChevronDown, ChevronUp, Save, AlertCircle, CheckCircle, Lock, GripVertical,
  Download, BarChart2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface User { id: string; personal_id: string; username: string; role: string; created_at: string; }
interface ContentItem { id: string; content_id: string; type: string; label: string; file_path?: string | null; url?: string | null; order: number; }
interface Content { id: string; unit_id: string; title: string; description: string; order: number; lock_conditions: string[]; items: ContentItem[]; }
interface Unit { id: string; title: string; description: string; order: number; contents: Content[]; }

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', color: '#fff', fontSize: 13, fontWeight: 500, background: type === 'success' ? '#16a34a' : '#dc2626' }}>
      {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {msg}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: 520, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '0.5px solid #e5e7eb' }}>
          <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{title}</h3>
          <button onClick={onClose} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 };
const btnPrimary: React.CSSProperties = { background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };

// ─── SortableContent ─────────────────────────────────────────────────────────
function SortableContent({
  content, allContents, onEdit, onDelete, onAddItem, onEditItem, onDeleteItem
}: {
  content: Content;
  allContents: Content[];
  onEdit: (c: Content) => void;
  onDelete: (id: string) => void;
  onAddItem: (contentId: string) => void;
  onEditItem: (contentId: string, item: ContentItem) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: content.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeBadge = (type: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      video: { bg: '#eff6ff', color: '#2563eb', label: '動画' },
      pdf:   { bg: '#faf5ff', color: '#7c3aed', label: 'PDF' },
      link:  { bg: '#f0fdf4', color: '#16a34a', label: 'リンク' },
    };
    const s = map[type] ?? { bg: '#f3f4f6', color: '#6b7280', label: type };
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>{s.label}</span>;
  };

  const labelBadge = (label: string) => {
    const map: Record<string, string> = { '学習用': '#2563eb', '課題用': '#c2410c', '解答用': '#16a34a', '参考資料': '#6b7280' };
    return <span style={{ fontSize: 11, color: map[label] ?? '#6b7280', fontWeight: 500 }}>{label}</span>;
  };

  return (
    <div ref={setNodeRef} style={{ ...style, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {/* Drag handle */}
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#d1d5db', paddingTop: 2, flexShrink: 0, touchAction: 'none' }}>
            <GripVertical size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14, marginBottom: 2 }}>{content.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{content.description}</div>
            {content.lock_conditions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#d97706' }}>
                <Lock size={11} />
                {content.lock_conditions.map(id => {
                  const dep = allContents.find(x => x.id === id);
                  return dep ? <span key={id} style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>{dep.title}</span> : null;
                })}
                完了後に解放
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(content)}
            style={{ padding: 5, color: '#378ADD', background: '#eff6ff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
            <Edit size={13} />
          </button>
          <button onClick={() => onDelete(content.id)}
            style={{ padding: 5, color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Items */}
      {(content.items ?? []).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, marginLeft: 24 }}>
          {content.items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 7, fontSize: 12 }}>
              {typeBadge(item.type)}
              {labelBadge(item.label)}
              <span style={{ color: '#9ca3af', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.file_path ? item.file_path.split('/').pop() : item.url ?? '未設定'}
              </span>
              <button onClick={() => onEditItem(content.id, item)}
                style={{ fontSize: 11, color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit' }}>変更</button>
              <button onClick={() => onDeleteItem(item.id)}
                style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit' }}>削除</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginLeft: 24 }}>
        <button onClick={() => onAddItem(content.id)}
          style={{ fontSize: 12, color: '#378ADD', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <Plus size={12} /> アイテムを追加
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'units' | 'users' | 'logs'>('units');

  // Log export state
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');
  const [logContentId, setLogContentId] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState<{ contentId: string; item?: ContentItem } | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [editContent, setEditContent] = useState<Content | null>(null);

  // Forms
  const [userForm, setUserForm] = useState({ username: '', personal_id: '', password: '', role: 'user' });
  const [unitForm, setUnitForm] = useState({ title: '', description: '' });
  const [contentForm, setContentForm] = useState({ title: '', description: '', lock_conditions: [] as string[] });
  const [itemForm, setItemForm] = useState({ type: 'pdf', label: '学習用', url: '' });
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [uploadingItem, setUploadingItem] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });
  const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user?.role !== 'admin') router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') loadAll();
  }, [status]);

  const loadAll = () => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers);
    fetch('/api/units').then(r => r.json()).then(data => setUnits(Array.isArray(data) ? data : []));
  };

  const allContents = units.flatMap(u => u.contents ?? []);

  // ─── Drag end: reorder contents within a unit ──────────────────────────────
  const handleDragEnd = async (event: DragEndEvent, unitId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const oldIndex = unit.contents.findIndex(c => c.id === active.id);
    const newIndex = unit.contents.findIndex(c => c.id === over.id);
    const newContents = arrayMove(unit.contents, oldIndex, newIndex);

    // Optimistic update
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, contents: newContents } : u));

    // Persist
    const orders = newContents.map((c, i) => ({ id: c.id, order: i }));
    const res = await fetch('/api/contents/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) {
      showToast('並べ替えの保存に失敗しました', 'error');
      loadAll(); // revert
    } else {
      showToast('順番を保存しました');
    }
  };

  // ─── User actions ──────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
    if (!res.ok) { showToast('作成に失敗しました（IDが重複している可能性があります）', 'error'); return; }
    showToast('ユーザーを作成しました');
    setShowUserModal(false);
    setUserForm({ username: '', personal_id: '', password: '', role: 'user' });
    loadAll();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('このユーザーを削除しますか？')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadAll();
  };

  // ─── Unit actions ──────────────────────────────────────────────────────────
  const handleSaveUnit = async () => {
    const method = editUnit ? 'PUT' : 'POST';
    const url = editUnit ? `/api/units/${editUnit.id}` : '/api/units';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(unitForm) });
    showToast(editUnit ? '単元を更新しました' : '単元を作成しました');
    setShowUnitModal(false); setEditUnit(null);
    setUnitForm({ title: '', description: '' });
    loadAll();
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('この単元とすべてのコンテンツを削除しますか？')) return;
    await fetch(`/api/units/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadAll();
  };

  // ─── Content actions ───────────────────────────────────────────────────────
  const handleSaveContent = async () => {
    if (editContent) {
      await fetch(`/api/contents/${editContent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contentForm) });
      showToast('コンテンツを更新しました');
    } else if (showContentModal) {
      const unit = units.find(u => u.id === showContentModal);
      const order = unit ? (unit.contents ?? []).length : 0;
      await fetch('/api/contents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contentForm, unit_id: showContentModal, order }) });
      showToast('コンテンツを作成しました');
    }
    setShowContentModal(null); setEditContent(null);
    setContentForm({ title: '', description: '', lock_conditions: [] });
    loadAll();
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('このコンテンツを削除しますか？')) return;
    await fetch(`/api/contents/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadAll();
  };

  // ─── Item actions ──────────────────────────────────────────────────────────
  const handleSaveItem = async () => {
    if (!showItemModal) return;
    setUploadingItem(true);

    if (itemForm.type === 'link') {
      if (showItemModal.item) {
        await fetch(`/api/items/${showItemModal.item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'link', label: itemForm.label, url: itemForm.url }) });
      } else {
        await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content_id: showItemModal.contentId, type: 'link', label: itemForm.label, url: itemForm.url }) });
      }
      showToast('保存しました');
    } else if (itemFile) {
      const form = new FormData();
      form.append('file', itemFile);
      form.append('type', 'content_item');
      form.append('contentId', showItemModal.contentId);
      form.append('itemType', itemForm.type);
      form.append('label', itemForm.label);
      form.append('order', '0');
      if (showItemModal.item) form.append('existingItemId', showItemModal.item.id);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) { showToast('アップロードに失敗しました', 'error'); setUploadingItem(false); return; }
      showToast('アップロード完了');
    } else if (showItemModal.item) {
      await fetch(`/api/items/${showItemModal.item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: itemForm.type, label: itemForm.label }) });
      showToast('更新しました');
    }

    setUploadingItem(false);
    setShowItemModal(null);
    setItemForm({ type: 'pdf', label: '学習用', url: '' });
    setItemFile(null);
    loadAll();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('このアイテムを削除しますか？')) return;
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    showToast('削除しました');
    loadAll();
  };

  if (status === 'loading') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', ...f }}>
      <Header />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 24 }}>管理者画面</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
          {([
            { key: 'units', label: '単元・コンテンツ管理', icon: <BookOpen size={14} /> },
            { key: 'users', label: 'ユーザー管理', icon: <Users size={14} /> },
            { key: 'logs',  label: 'ログエクスポート',    icon: <BarChart2 size={14} /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #378ADD' : '2px solid transparent', color: tab === t.key ? '#378ADD' : '#6b7280', cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── UNITS TAB ── */}
        {tab === 'units' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => { setEditUnit(null); setUnitForm({ title: '', description: '' }); setShowUnitModal(true); }} style={btnPrimary}>
                <Plus size={15} /> 単元を追加
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {units.map(unit => (
                <div key={unit.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Unit header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {expandedUnit === unit.id ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{unit.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{unit.description} · {(unit.contents ?? []).length}コンテンツ</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditUnit(unit); setUnitForm({ title: unit.title, description: unit.description }); setShowUnitModal(true); }}
                        style={{ padding: 6, color: '#378ADD', background: '#eff6ff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteUnit(unit.id)}
                        style={{ padding: 6, color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Contents with DnD */}
                  {expandedUnit === unit.id && (
                    <div style={{ borderTop: '0.5px solid #f3f4f6', background: '#f9fafb', padding: '12px 16px' }}>
                      {(unit.contents ?? []).length > 1 && (
                        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <GripVertical size={11} /> ドラッグして並べ替え
                        </p>
                      )}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, unit.id)}>
                        <SortableContext items={(unit.contents ?? []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(unit.contents ?? []).map(c => (
                              <SortableContent
                                key={c.id}
                                content={c}
                                allContents={allContents}
                                onEdit={(content) => {
                                  setEditContent(content);
                                  setContentForm({ title: content.title, description: content.description, lock_conditions: content.lock_conditions });
                                  setShowContentModal(content.unit_id);
                                }}
                                onDelete={handleDeleteContent}
                                onAddItem={(contentId) => { setShowItemModal({ contentId }); setItemForm({ type: 'pdf', label: '学習用', url: '' }); setItemFile(null); }}
                                onEditItem={(contentId, item) => { setShowItemModal({ contentId, item }); setItemForm({ type: item.type, label: item.label, url: item.url ?? '' }); setItemFile(null); }}
                                onDeleteItem={handleDeleteItem}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <button onClick={() => { setEditContent(null); setContentForm({ title: '', description: '', lock_conditions: [] }); setShowContentModal(unit.id); }}
                        style={{ width: '100%', marginTop: 10, padding: '10px', border: '1.5px dashed #d1d5db', borderRadius: 8, fontSize: 13, color: '#6b7280', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
                        <Plus size={13} /> コンテンツを追加
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {units.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                  <BookOpen size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>単元がありません。追加してください。</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowUserModal(true)} style={btnPrimary}>
                <Plus size={15} /> ユーザーを追加
              </button>
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid #e5e7eb' }}>
                    {['名前', 'ID', '権限', '登録日', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: '#111827' }}>{u.username}</td>
                      <td style={{ padding: '10px 16px', color: '#6b7280', fontFamily: 'monospace' }}>{u.personal_id}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: u.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: u.role === 'admin' ? '#1d4ed8' : '#6b7280' }}>
                          {u.role === 'admin' ? '管理者' : 'ユーザー'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => handleDeleteUser(u.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>ユーザーがいません</div>}
            </div>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === 'logs' && (
          <div>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 24, maxWidth: 560 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>行動ログCSVエクスポート</h2>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
                期間・コンテンツで絞り込んでダウンロードできます。未指定の場合は全件取得します（上限50,000件）。
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>開始日</label>
                    <input type="date" value={logFrom} onChange={e => setLogFrom(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>終了日</label>
                    <input type="date" value={logTo} onChange={e => setLogTo(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>コンテンツで絞り込み（任意）</label>
                  <select value={logContentId} onChange={e => setLogContentId(e.target.value)} style={inputStyle}>
                    <option value="">すべてのコンテンツ</option>
                    {units.flatMap(u => (u.contents ?? []).map(c => (
                      <option key={c.id} value={c.id}>{u.title} › {c.title}</option>
                    )))}
                  </select>
                </div>

                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>CSV列：</div>
                  personal_id, content_id, item_id, event, payload, client_time, created_at
                </div>

                <button
                  disabled={exportLoading}
                  onClick={async () => {
                    setExportLoading(true);
                    const params = new URLSearchParams();
                    if (logFrom) params.set('from', logFrom);
                    if (logTo) params.set('to', logTo);
                    if (logContentId) params.set('contentId', logContentId);
                    try {
                      const res = await fetch(`/api/admin/logs/export?${params}`);
                      if (!res.ok) { showToast('エクスポートに失敗しました', 'error'); return; }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `event_logs_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('ダウンロードしました');
                    } finally {
                      setExportLoading(false);
                    }
                  }}
                  style={{ ...btnPrimary, justifyContent: 'center', padding: '10px', opacity: exportLoading ? 0.6 : 1 }}
                >
                  <Download size={15} />
                  {exportLoading ? 'エクスポート中...' : 'CSVをダウンロード'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── USER MODAL ── */}
      {showUserModal && (
        <Modal title="ユーザーを作成" onClose={() => setShowUserModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ label: '名前', key: 'username', type: 'text', placeholder: '山田 太郎' }, { label: 'ID（ログイン用）', key: 'personal_id', type: 'text', placeholder: 'student03' }, { label: 'パスワード', key: 'password', type: 'password', placeholder: '••••••••' }].map(field => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input type={field.type} placeholder={field.placeholder} value={(userForm as any)[field.key]}
                  onChange={e => setUserForm(p => ({ ...p, [field.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>権限</label>
              <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                <option value="user">ユーザー（生徒）</option>
                <option value="admin">管理者（教員）</option>
              </select>
            </div>
            <button onClick={handleCreateUser} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '10px' }}>
              <Save size={15} /> 作成する
            </button>
          </div>
        </Modal>
      )}

      {/* ── UNIT MODAL ── */}
      {showUnitModal && (
        <Modal title={editUnit ? '単元を編集' : '単元を作成'} onClose={() => { setShowUnitModal(false); setEditUnit(null); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>単元名</label>
              <input type="text" placeholder="例：二次関数" value={unitForm.title} onChange={e => setUnitForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>説明</label>
              <textarea placeholder="この単元で学ぶ内容" value={unitForm.description} onChange={e => setUnitForm(p => ({ ...p, description: e.target.value }))}
                style={{ ...inputStyle, height: 80, resize: 'none' }} />
            </div>
            <button onClick={handleSaveUnit} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '10px' }}>
              <Save size={15} /> {editUnit ? '更新する' : '作成する'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── CONTENT MODAL ── */}
      {showContentModal && (
        <Modal title={editContent ? 'コンテンツを編集' : 'コンテンツを追加'} onClose={() => { setShowContentModal(null); setEditContent(null); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>コンテンツ名</label>
              <input type="text" placeholder="例：二次関数とは" value={contentForm.title} onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>説明</label>
              <textarea placeholder="このコンテンツで学ぶ内容" value={contentForm.description} onChange={e => setContentForm(p => ({ ...p, description: e.target.value }))}
                style={{ ...inputStyle, height: 72, resize: 'none' }} />
            </div>
            {(() => {
              const unitId = editContent?.unit_id || showContentModal;
              const available = allContents.filter(c => c.unit_id === unitId && c.id !== editContent?.id);
              if (available.length === 0) return null;
              return (
                <div>
                  <label style={labelStyle}><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />ロック条件</label>
                  <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {available.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={contentForm.lock_conditions.includes(c.id)}
                          onChange={e => setContentForm(p => ({ ...p, lock_conditions: e.target.checked ? [...p.lock_conditions, c.id] : p.lock_conditions.filter(id => id !== c.id) }))} />
                        {c.title}
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>チェックしたコンテンツを完了しないとアクセスできません</p>
                </div>
              );
            })()}
            <button onClick={handleSaveContent} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '10px' }}>
              <Save size={15} /> {editContent ? '更新する' : '作成する'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── ITEM MODAL ── */}
      {showItemModal && (
        <Modal title={showItemModal.item ? 'アイテムを編集' : 'アイテムを追加'} onClose={() => { setShowItemModal(null); setItemFile(null); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>種類</label>
              <select value={itemForm.type} onChange={e => setItemForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                <option value="pdf">PDF</option>
                <option value="video">動画</option>
                <option value="link">リンク（URL）</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>用途ラベル</label>
              <select value={itemForm.label} onChange={e => setItemForm(p => ({ ...p, label: e.target.value }))} style={inputStyle}>
                <option value="学習用">学習用</option>
                <option value="課題用">課題用</option>
                <option value="解答用">解答用</option>
                <option value="参考資料">参考資料</option>
              </select>
            </div>
            {itemForm.type === 'link' ? (
              <div>
                <label style={labelStyle}>URL</label>
                <input type="url" placeholder="https://..." value={itemForm.url} onChange={e => setItemForm(p => ({ ...p, url: e.target.value }))} style={inputStyle} />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>ファイル</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
                  <Upload size={14} />
                  {itemFile ? itemFile.name : showItemModal.item?.file_path ? '変更する（任意）' : 'ファイルを選択'}
                  <input type="file" accept={itemForm.type === 'video' ? 'video/*' : '.pdf'} style={{ display: 'none' }}
                    onChange={e => setItemFile(e.target.files?.[0] ?? null)} />
                </label>
                {showItemModal.item?.file_path && !itemFile && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>現在: {showItemModal.item.file_path.split('/').pop()}</p>
                )}
              </div>
            )}
            <button onClick={handleSaveItem} disabled={uploadingItem}
              style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '10px', opacity: uploadingItem ? 0.6 : 1 }}>
              <Save size={15} /> {uploadingItem ? '処理中...' : showItemModal.item ? '更新する' : '追加する'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}