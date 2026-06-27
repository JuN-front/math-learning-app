'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  Users, BookOpen, Plus, Trash2, Edit, Upload, X,
  ChevronDown, ChevronUp, Save, AlertCircle, CheckCircle, Lock
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface User { id: string; personal_id: string; username: string; role: string; created_at: string; }
interface Unit { id: string; title: string; description: string; order: number; }
interface Content {
  id: string; unit_id: string; title: string; description: string; order: number;
  has_video: boolean; has_textbook: boolean; has_assignment: boolean;
  video_path: string | null; textbook_path: string | null;
  assignment_path: string | null; answer_path: string | null;
  lock_conditions: string[];
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'units' | 'users'>('units');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState<string | null>(null); // unit_id
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [editContent, setEditContent] = useState<Content | null>(null);

  // Forms
  const [userForm, setUserForm] = useState({ username: '', personal_id: '', password: '', role: 'user' });
  const [unitForm, setUnitForm] = useState({ title: '', description: '' });
  const [contentForm, setContentForm] = useState({
    title: '', description: '', has_video: false, has_textbook: true,
    has_assignment: false, lock_conditions: [] as string[],
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.push('/dashboard');
  }, [status, session, router]);

  // Load data
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      loadAll();
    }
  }, [status]);

  const loadAll = () => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers);
    fetch('/api/units').then(r => r.json()).then(setUnits);
    fetch('/api/contents').then(r => r.json()).then(setContents);
  };

  // ─── User actions ──────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm),
    });
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
  const handleCreateUnit = async () => {
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
      await fetch(`/api/contents/${editContent.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentForm),
      });
      showToast('コンテンツを更新しました');
    } else if (showContentModal) {
      await fetch('/api/contents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contentForm, unit_id: showContentModal }),
      });
      showToast('コンテンツを作成しました');
    }
    setShowContentModal(null); setEditContent(null);
    setContentForm({ title: '', description: '', has_video: false, has_textbook: true, has_assignment: false, lock_conditions: [] });
    loadAll();
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('このコンテンツを削除しますか？')) return;
    await fetch(`/api/contents/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadAll();
  };

  // ─── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (contentId: string, fileType: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('content_id', contentId);
    form.append('file_type', fileType);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) { showToast('アップロードに失敗しました', 'error'); return; }
    showToast('アップロード完了');
    loadAll();
  };

  if (status === 'loading') return null;

  const unitContents = (unitId: string) => contents.filter(c => c.unit_id === unitId);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header />

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">管理者画面</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['units', 'users'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'units' ? <><BookOpen size={14} className="inline mr-1.5" />単元・コンテンツ管理</> : <><Users size={14} className="inline mr-1.5" />ユーザー管理</>}
            </button>
          ))}
        </div>

        {/* ── UNITS TAB ─────────────────────────────────────────────────────── */}
        {tab === 'units' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEditUnit(null); setUnitForm({ title: '', description: '' }); setShowUnitModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} /> 単元を追加
              </button>
            </div>

            <div className="space-y-4">
              {units.map(unit => (
                <div key={unit.id} className="card overflow-hidden">
                  {/* Unit header */}
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}>
                    <div className="flex items-center gap-3">
                      {expandedUnit === unit.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      <div>
                        <div className="font-semibold text-gray-900">{unit.title}</div>
                        <div className="text-sm text-gray-500">{unit.description} · {unitContents(unit.id).length}コンテンツ</div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditUnit(unit); setUnitForm({ title: unit.title, description: unit.description }); setShowUnitModal(true); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteUnit(unit.id)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Contents */}
                  {expandedUnit === unit.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                      {unitContents(unit.id).map(c => (
                        <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 mb-0.5">{c.title}</div>
                              <div className="text-sm text-gray-500 mb-2">{c.description}</div>
                              {/* Lock conditions */}
                              {c.lock_conditions.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                                  <Lock size={11} />
                                  {c.lock_conditions.map(id => {
                                    const dep = contents.find(x => x.id === id);
                                    return dep ? <span key={id} className="bg-amber-50 px-1.5 py-0.5 rounded">{dep.title}</span> : null;
                                  })}
                                  完了後に解放
                                </div>
                              )}
                              {/* File uploads */}
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {c.has_video && (
                                  <FileUploadRow label="動画" path={c.video_path} accept="video/*"
                                    onUpload={f => handleFileUpload(c.id, 'video', f)} />
                                )}
                                {c.has_textbook && (
                                  <FileUploadRow label="テキスト(PDF)" path={c.textbook_path} accept=".pdf"
                                    onUpload={f => handleFileUpload(c.id, 'textbook', f)} />
                                )}
                                {c.has_assignment && (
                                  <>
                                    <FileUploadRow label="課題(PDF)" path={c.assignment_path} accept=".pdf"
                                      onUpload={f => handleFileUpload(c.id, 'assignment', f)} />
                                    <FileUploadRow label="解答(PDF)" path={c.answer_path} accept=".pdf"
                                      onUpload={f => handleFileUpload(c.id, 'answer', f)} />
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => {
                                setEditContent(c);
                                setContentForm({
                                  title: c.title, description: c.description,
                                  has_video: c.has_video, has_textbook: c.has_textbook, has_assignment: c.has_assignment,
                                  lock_conditions: c.lock_conditions,
                                });
                                setShowContentModal(c.unit_id);
                              }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDeleteContent(c.id)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded transition">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          setEditContent(null);
                          setContentForm({ title: '', description: '', has_video: false, has_textbook: true, has_assignment: false, lock_conditions: [] });
                          setShowContentModal(unit.id);
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> コンテンツを追加
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {units.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
                  <p>単元がありません。追加してください。</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowUserModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} /> ユーザーを追加
              </button>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">権限</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">登録日</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{u.personal_id}</td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${u.role === 'admin' ? 'status-in-progress' : 'status-not-started'}`}>
                          {u.role === 'admin' ? '管理者' : 'ユーザー'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-10 text-gray-400">ユーザーがいません</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── USER MODAL ──────────────────────────────────────────────────────── */}
      {showUserModal && (
        <Modal title="ユーザーを作成" onClose={() => setShowUserModal(false)}>
          <div className="space-y-4">
            {[
              { label: '名前', key: 'username', type: 'text', placeholder: '山田 太郎' },
              { label: 'ID（ログイン用）', key: 'personal_id', type: 'text', placeholder: 'student03' },
              { label: 'パスワード', key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(userForm as any)[f.key]}
                  onChange={e => setUserForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">権限</label>
              <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="user">ユーザー（生徒）</option>
                <option value="admin">管理者（教員）</option>
              </select>
            </div>
            <button onClick={handleCreateUser} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
              <Save size={16} /> 作成する
            </button>
          </div>
        </Modal>
      )}

      {/* ── UNIT MODAL ──────────────────────────────────────────────────────── */}
      {showUnitModal && (
        <Modal title={editUnit ? '単元を編集' : '単元を作成'} onClose={() => { setShowUnitModal(false); setEditUnit(null); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">単元名</label>
              <input type="text" placeholder="例：二次関数"
                value={unitForm.title} onChange={e => setUnitForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea placeholder="この単元で学ぶ内容を入力"
                value={unitForm.description} onChange={e => setUnitForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
            </div>
            <button onClick={handleCreateUnit} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
              <Save size={16} /> {editUnit ? '更新する' : '作成する'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── CONTENT MODAL ───────────────────────────────────────────────────── */}
      {showContentModal && (
        <Modal title={editContent ? 'コンテンツを編集' : 'コンテンツを追加'} onClose={() => { setShowContentModal(null); setEditContent(null); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">コンテンツ名</label>
              <input type="text" placeholder="例：二次関数とは"
                value={contentForm.title} onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea placeholder="このコンテンツで学ぶ内容"
                value={contentForm.description} onChange={e => setContentForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              />
            </div>
            {/* Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">含めるコンテンツタイプ</label>
              <div className="space-y-2">
                {[
                  { key: 'has_video', label: '学習動画' },
                  { key: 'has_textbook', label: '学習テキスト（PDF）' },
                  { key: 'has_assignment', label: '課題提出' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(contentForm as any)[opt.key]}
                      onChange={e => setContentForm(p => ({ ...p, [opt.key]: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Lock conditions */}
            {(() => {
              const unitId = editContent?.unit_id || showContentModal;
              const available = contents.filter(c => c.unit_id === unitId && c.id !== editContent?.id);
              if (available.length === 0) return null;
              return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock size={13} className="inline mr-1" />ロック条件（完了が必要なコンテンツ）
                  </label>
                  <div className="space-y-1.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {available.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={contentForm.lock_conditions.includes(c.id)}
                          onChange={e => {
                            setContentForm(p => ({
                              ...p,
                              lock_conditions: e.target.checked
                                ? [...p.lock_conditions, c.id]
                                : p.lock_conditions.filter(id => id !== c.id),
                            }));
                          }}
                          className="w-4 h-4 accent-amber-600"
                        />
                        <span className="text-sm text-gray-700">{c.title}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">チェックしたコンテンツを完了しないとアクセスできません</p>
                </div>
              );
            })()}
            <button onClick={handleSaveContent} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
              <Save size={16} /> {editContent ? '更新する' : '作成する'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── File upload row component ────────────────────────────────────────────────
function FileUploadRow({ label, path, accept, onUpload }: {
  label: string; path: string | null; accept: string; onUpload: (f: File) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      {path ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-600 truncate">✓ アップロード済み</span>
          <label className="text-xs text-blue-500 hover:underline cursor-pointer ml-1">
            変更
            <input type="file" accept={accept} className="hidden" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400 hover:text-blue-500">
          <Upload size={11} />
          アップロード
          <input type="file" accept={accept} className="hidden" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
        </label>
      )}
    </div>
  );
}
