import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import type { ProductAttribute } from '../types/admin';

interface SpecsEditorProps {
  specs: ProductAttribute[];
  onAdd: (spec: Omit<ProductAttribute, 'id'>) => Promise<void>;
  onUpdate: (id: string, spec: Partial<ProductAttribute>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder?: (specs: ProductAttribute[]) => Promise<void>;
}

const SpecsEditor: React.FC<SpecsEditorProps> = ({
  specs = [],
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}) => {
  // Add spec form state
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newOrder, setNewOrder] = useState(0);
  const [adding, setAdding] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [updating, setUpdating] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;
    setAdding(true);
    try {
      await onAdd({
        name: newName.trim(),
        value: newValue.trim(),
        unit: newUnit.trim(),
        sort_order: newOrder || specs.length + 1,
      });
      setNewName('');
      setNewValue('');
      setNewUnit('');
      setNewOrder(0);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (spec: ProductAttribute) => {
    setEditingId(spec.id);
    setEditName(spec.name);
    setEditValue(spec.value);
    setEditUnit(spec.unit);
    setEditOrder(spec.sort_order);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editValue.trim() || !editingId) return;
    setUpdating(true);
    try {
      await onUpdate(editingId, {
        name: editName.trim(),
        value: editValue.trim(),
        unit: editUnit.trim(),
        sort_order: editOrder,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (!onReorder) return;
    const newSpecs = [...specs].sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSpecs.length) return;

    // Swap sort_order
    const temp = newSpecs[index].sort_order;
    newSpecs[index].sort_order = newSpecs[targetIndex].sort_order;
    newSpecs[targetIndex].sort_order = temp;

    // Reassign serial sort order to avoid duplicates
    const reordered = newSpecs.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    // Update locally first to avoid flickering
    await onReorder(reordered);
  };

  const sortedSpecs = [...specs].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {/* List of Specs */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-4 py-3">Specification Name</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-center">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedSpecs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                  No technical specifications defined yet. Add one below.
                </td>
              </tr>
            ) : (
              sortedSpecs.map((spec, index) => {
                const isEditing = editingId === spec.id;
                return (
                  <tr key={spec.id} className="hover:bg-slate-50/50 transition-colors">
                    {isEditing ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#005B63]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#005B63]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            placeholder="e.g. V, Hz"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#005B63]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#005B63] mx-auto text-center"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={updating}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-700">{spec.name}</td>
                        <td className="px-4 py-3 text-slate-600">{spec.value}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{spec.unit || '—'}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">{spec.sort_order}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1">
                            {onReorder && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => moveItem(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(index, 'down')}
                                  disabled={index === sortedSpecs.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(spec)}
                              className="px-2 py-1 text-xs font-semibold text-[#005B63] hover:bg-[#E6F2F2] rounded-lg ml-2"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(spec.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Spec Form */}
      <form onSubmit={handleAdd} className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Specification Attribute</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Attribute Name (e.g. Rotation Speed, Voltage)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-medium"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Value (e.g. 400,000, 220-240)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-medium"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Unit (optional, e.g. rpm, V)"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-medium"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Display Order:</span>
            <input
              type="number"
              min={0}
              placeholder="Auto"
              value={newOrder || ''}
              onChange={(e) => setNewOrder(Number(e.target.value))}
              className="w-20 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white text-center font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim() || !newValue.trim()}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[#005B63] text-white hover:bg-[#004b52] rounded-xl text-xs font-bold transition-all shadow disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Attribute
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpecsEditor;
