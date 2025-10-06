import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator, Camera, Upload, X } from 'lucide-react';
import { supabase, type Room, type Measurement, type MeasurementCategory, type MeasurementUnit, type CategorySetting } from '../lib/supabase';

interface RoomDetailProps {
  room: Room;
  onBack: () => void;
}

const unitLabels: Record<MeasurementUnit, string> = {
  'm2': 'm²',
  'lfm': 'lfm',
  'stk': 'Stk.',
  'pauschal': 'pauschal'
};

export function RoomDetail({ room, onBack }: RoomDetailProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '' as MeasurementCategory,
    description: '',
    unit: 'm2' as MeasurementUnit,
    length: '',
    width: '',
    height: '',
    quantity: '',
    notes: '',
    photos: [] as string[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeasurements();
    loadCategories();
  }, [room.id]);

  async function loadCategories() {
    try {
      let query = supabase.from('category_settings').select('*').eq('is_active', true).order('category', { ascending: true });
      try {
        const proj = await supabase.from('projects').select('scope').eq('id', room.project_id as any).single();
        const scope = (proj.data as any)?.scope as ('innen'|'aussen'|undefined);
        const { data, error } = scope ? await query.eq('scope', scope as any) : await query;
        if (error) throw error;
        setCategories(data || []);
        if (data && data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data[0].category }));
        }
      } catch (_) {
        const { data } = await query;
        setCategories(data || []);
        if (data && data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: data[0].category }));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  }

  async function loadMeasurements() {
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Ausmasse:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateQuantity() {
    const length = parseFloat(formData.length) || 0;
    const width = parseFloat(formData.width) || 0;
    const height = parseFloat(formData.height) || 0;

    if (formData.unit === 'm2') {
      if (length && width) {
        return (length * width).toFixed(2);
      } else if (length && height) {
        return (length * height).toFixed(2);
      } else if (width && height) {
        return (width * height).toFixed(2);
      } else if (length) {
        return length.toFixed(2);
      } else if (width) {
        return width.toFixed(2);
      } else if (height) {
        return height.toFixed(2);
      }
    } else if (formData.unit === 'lfm') {
      if (length) {
        return length.toFixed(2);
      }
    }

    return formData.quantity || '0.00';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const quantity = parseFloat(calculateQuantity() || '0');
    if (quantity <= 0) {
      alert('Bitte geben Sie gültige Masse ein.');
      return;
    }

    try {
      const { error } = await supabase
        .from('measurements')
        .insert([{
          room_id: room.id,
          category: formData.category,
          description: formData.description,
          unit: formData.unit,
          length: formData.length ? parseFloat(formData.length) : null,
          width: formData.width ? parseFloat(formData.width) : null,
          height: formData.height ? parseFloat(formData.height) : null,
          quantity,
          notes: formData.notes
        }]);

      if (error) throw error;

      setFormData({
        category: categories.length > 0 ? categories[0].category : '',
        description: '',
        unit: 'm2',
        length: '',
        width: '',
        height: '',
        quantity: '',
        notes: '',
        photos: []
      });
      setShowForm(false);
      loadMeasurements();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Möchten Sie diese Position wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadMeasurements();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  }

  const groupedMeasurements = measurements.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, Measurement[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{room.name}</h1>
        <p className="text-gray-600">Ausmass erfassen</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Positionen</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} />
            Position hinzufügen
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MeasurementCategory })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  {categories.length === 0 ? (
                    <option value="">Keine Kategorien verfügbar</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.category}>{cat.category}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Einheit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as MeasurementUnit })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="m2">m² (Quadratmeter)</option>
                  <option value="lfm">lfm (Laufmeter)</option>
                  <option value="stk">Stück</option>
                  <option value="pauschal">pauschal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. Nordwand, Hauptfenster"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {formData.unit !== 'stk' && formData.unit !== 'pauschal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Länge (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              )}

              {formData.unit === 'm2' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breite (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              )}

              {formData.unit === 'm2' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Höhe (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              )}

              {formData.unit === 'stk' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anzahl *
                  </label>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0"
                    required
                  />
                </div>
              )}

              {formData.unit === 'pauschal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Betrag *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}
            </div>

            {formData.unit !== 'stk' && formData.unit !== 'pauschal' && (
              <div className="flex items-center gap-2 p-4 bg-accent-light rounded-lg">
                <Calculator size={20} className="text-primary" />
                <span className="text-black font-medium">
                  Berechnet: {calculateQuantity()} {unitLabels[formData.unit]}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotos
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition-all cursor-pointer">
                    <Camera size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Foto aufnehmen</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFormData({ ...formData, photos: [...formData.photos, reader.result as string] });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition-all cursor-pointer">
                    <Upload size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Foto hochladen</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFormData(prev => ({ ...prev, photos: [...prev.photos, reader.result as string] }));
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) })}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notizen
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Zusätzliche Informationen..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Lade Ausmasse...</p>
        ) : measurements.length === 0 ? (
          <p className="text-gray-500">Noch keine Positionen erfasst. Fügen Sie die erste Position hinzu.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMeasurements).map(([category, items]) => {
              const catLabel = categories.find(c => c.category === category)?.category || category;
              return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  {catLabel}
                  <span className="text-sm font-normal text-gray-500">
                    ({items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)} {unitLabels[items[0].unit]})
                  </span>
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.description}</p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          {item.length && <span>L: {item.length} m</span>}
                          {item.width && <span>B: {item.width} m</span>}
                          {item.height && <span>H: {item.height} m</span>}
                          <span className="font-medium text-primary">
                            = {item.quantity} {unitLabels[item.unit]}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-secondary hover:text-secondary-dark p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
