import { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase, type CategorySetting } from '../lib/supabase';

export function Settings() {
  const [settings, setSettings] = useState<CategorySetting[]>([]);
  const [activeScope, setActiveScope] = useState<'innen' | 'aussen'>('innen');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const taxOptions = [8.1, 0];
  function parseDecimal(value: string): number {
    const cleaned = value.replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  const [newCategory, setNewCategory] = useState({
    category: '',
    offer_title: '',
    offer_description: '',
    tax_rate: 8.1,
    unit_price: 0,
    is_active: true
  });

  useEffect(() => {
    loadSettings();
  }, [activeScope]);

  async function loadSettings() {
    try {
      let query = supabase.from('category_settings').select('*').order('category', { ascending: true });
      // Versuche erst nach scope zu filtern; fällt zurück, wenn Spalte noch nicht existiert
      try {
        const { data, error } = await query.eq('scope', activeScope as any);
        if (error) throw error;
        setSettings(data || []);
      } catch (_) {
        const { data } = await query; // ohne Filter
        setSettings(data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(setting: CategorySetting) {
    if (setting.tax_rate === undefined || setting.tax_rate === null) {
      alert('Bitte wählen Sie einen MwSt-Satz');
      return;
    }
    if (setting.unit_price < 0) {
      alert('Der Einheitspreis darf nicht negativ sein');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('category_settings')
        .update({
          offer_title: setting.offer_title,
          offer_description: setting.offer_description,
          tax_rate: setting.tax_rate,
          unit_price: setting.unit_price,
          is_active: setting.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', setting.id);

      if (error) throw error;

      setSuccessMessage('Kategorie gespeichert');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Kategorie');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.category || !newCategory.offer_title) {
      alert('Bitte Kategorie-Name und Titel eingeben');
      return;
    }
    if (newCategory.tax_rate === undefined || newCategory.tax_rate === null) {
      alert('Bitte wählen Sie einen MwSt-Satz');
      return;
    }
    if (newCategory.unit_price < 0) {
      alert('Der Einheitspreis darf nicht negativ sein');
      return;
    }

    setSaving(true);
    try {
      // Versuch mit scope
      let { error } = await supabase.from('category_settings').insert({
        category: newCategory.category.toLowerCase().replace(/\s+/g, '_'),
        offer_title: newCategory.offer_title,
        offer_description: newCategory.offer_description || null,
        tax_rate: newCategory.tax_rate,
        unit_price: newCategory.unit_price,
        is_active: newCategory.is_active,
        scope: activeScope as any,
      });
      if (error) {
        // Fallback ohne scope (Spalte evtl. noch nicht vorhanden)
        const res = await supabase.from('category_settings').insert({
          category: newCategory.category.toLowerCase().replace(/\s+/g, '_'),
          offer_title: newCategory.offer_title,
          offer_description: newCategory.offer_description || null,
          tax_rate: newCategory.tax_rate,
          unit_price: newCategory.unit_price,
          is_active: newCategory.is_active,
        });
        error = res.error as any;
        if (error) throw error;
      }

      if (error) throw error;

      setSuccessMessage('Kategorie erstellt');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowNewCategory(false);
      setNewCategory({
        category: '',
        offer_title: '',
        offer_description: '',
        tax_rate: 8.1,
        unit_price: 0,
        is_active: true
      });
      await loadSettings();
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      alert('Fehler beim Erstellen der Kategorie');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Möchten Sie diese Kategorie wirklich löschen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('category_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMessage('Kategorie gelöscht');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadSettings();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Kategorie');
    }
  }

  function updateSetting(id: string, field: keyof CategorySetting, value: string | boolean | number) {
    setSettings(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lade Einstellungen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Einstellungen</h1>
            <p className="text-gray-600">Kategorietexte für Bexio-Offerten verwalten</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setActiveScope('innen')} className={`px-3 py-1 rounded border ${activeScope==='innen' ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>Innenarbeiten</button>
              <button onClick={() => setActiveScope('aussen')} className={`px-3 py-1 rounded border ${activeScope==='aussen' ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>Aussenarbeiten</button>
            </div>
          </div>
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} />
            Neue Kategorie
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-green-600" size={20} />
          <span className="text-green-800 font-medium">{successMessage}</span>
        </div>
      )}

      {showNewCategory && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-primary">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Neue Kategorie erstellen</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorie-Name *
              </label>
              <input
                type="text"
                value={newCategory.category}
                onChange={(e) => setNewCategory({ ...newCategory, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. Fassade, Garagentor, etc."
              />
              <p className="text-xs text-gray-500 mt-1">
                Wird automatisch zu einem technischen Namen konvertiert (z.B. "fassade")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bereich (Scope)</label>
              <select value={activeScope} onChange={(e)=>setActiveScope(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                <option value="innen">Innenarbeiten</option>
                <option value="aussen">Aussenarbeiten</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel für Bexio-Offerte *
              </label>
              <input
                type="text"
                value={newCategory.offer_title}
                onChange={(e) => setNewCategory({ ...newCategory, offer_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. Fassadenarbeiten"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                value={newCategory.offer_description}
                onChange={(e) => setNewCategory({ ...newCategory, offer_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Detaillierte Beschreibung für die Offerte..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MwSt-Satz *
                </label>
                <select
                  value={newCategory.tax_rate}
                  onChange={(e) => setNewCategory({ ...newCategory, tax_rate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  {taxOptions.map((o) => (
                    <option key={o} value={o}>{o.toFixed(1)} %</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Wird automatisch der passenden Steuer in Bexio zugeordnet.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Einheitspreis (CHF) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newCategory.unit_price}
                  onChange={(e) => setNewCategory({ ...newCategory, unit_price: parseDecimal(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-active"
                checked={newCategory.is_active}
                onChange={(e) => setNewCategory({ ...newCategory, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="new-active" className="text-sm text-gray-600">
                Kategorie ist aktiv
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory({
                    category: '',
                    offer_title: '',
                    offer_description: '',
                    tax_rate: 8.1,
                    unit_price: 0,
                    is_active: true
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <Plus size={18} />
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Diese Texte werden beim Übertragen zu Bexio als Positionstexte in der Offerte verwendet.
            Der Titel erscheint als Überschrift für jede Kategorie.
          </p>
        </div>

        {settings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Noch keine Kategorien vorhanden</p>
            <button
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors mx-auto"
            >
              <Plus size={20} />
              Erste Kategorie erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {setting.category}
                  </h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.is_active}
                        onChange={(e) => updateSetting(setting.id, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600">Aktiv</span>
                    </label>
                    <button
                      onClick={() => handleDelete(setting.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Kategorie löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel für Bexio-Offerte *
                    </label>
                    <input
                      type="text"
                      value={setting.offer_title}
                      onChange={(e) => updateSetting(setting.id, 'offer_title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="z.B. Malerarbeiten Wandflächen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung (optional)
                    </label>
                    <textarea
                      value={setting.offer_description || ''}
                      onChange={(e) => updateSetting(setting.id, 'offer_description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Detaillierte Beschreibung für die Offerte..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MwSt-Satz *
                      </label>
                      <select
                        value={setting.tax_rate}
                        onChange={(e) => updateSetting(setting.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                      >
                        {taxOptions.map((o) => (
                          <option key={o} value={o}>{o.toFixed(1)} %</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Entspricht den in Bexio verfügbaren Sätzen (z. B. 8.1 %, 0 %).</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Einheitspreis (CHF) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={setting.unit_price}
                        onChange={(e) => updateSetting(setting.id, 'unit_price', parseDecimal(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Bereich: {activeScope}</span>
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={saving}
                      className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      <Save size={18} />
                      Speichern
                    </button>
                  </div>
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Vorschau Bexio-Position</p>
                    <pre className="text-xs text-gray-700 overflow-x-auto">{`{
  text: ${JSON.stringify(setting.offer_title)}${setting.offer_description ? ' + "\\n' + setting.offer_description.replace(/\n/g, '\\n') + '"' : ''},
  amount: 1,
  unit_price: ${Number(setting.unit_price).toFixed(2)},
  unit_name: "Stk",
  tax_rate: ${Number(setting.tax_rate).toFixed(1)}
}`}</pre>
                    <p className="text-xs text-gray-500 mt-1">Hinweis: Einheit wird beim Übertragen je nach Ausmass automatisch gesetzt; ohne Mess-Einheit verwenden wir „Stk“.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
