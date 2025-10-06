import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase, type Customer } from '../lib/supabase';

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: (projectId: string) => void;
}

export function ProjectWizard({ onClose, onComplete }: ProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [projectData, setProjectData] = useState({
    customer_name: '',
    address: '',
    status: 'offeriert' as const,
    notes: '',
    scope: 'innen' as 'innen' | 'aussen'
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }

  function handleCustomerSelect(customer: Customer) {
    setSelectedCustomer(customer);
    setProjectData({
      ...projectData,
      customer_name: customer.name,
      address: customer.address || ''
    });
  }

  async function handleFinish() {
    if (!selectedCustomer) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          customer_id: selectedCustomer.id
        }])
        .select()
        .single();

      if (error) throw error;

      onComplete(data.id);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Erstellen des Projekts');
    } finally {
      setSaving(false);
    }
  }

  const canProceedStep1 = selectedCustomer !== null;
  const canProceedStep2 = projectData.customer_name.trim() !== '' && projectData.address.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Neues Projekt erstellen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <Check size={18} /> : '1'}
              </div>
              <span className="font-medium">Kunde</span>
            </div>

            <ChevronRight className="text-gray-400" size={20} />

            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                {step > 2 ? <Check size={18} /> : '2'}
              </div>
              <span className="font-medium">Projektangaben</span>
            </div>

            <ChevronRight className="text-gray-400" size={20} />

            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="font-medium">Ausmass</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Wählen Sie einen Kunden aus
              </h3>

              {loadingCustomers ? (
                <div className="text-center py-12 text-gray-500">
                  Lade Kunden...
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">Noch keine Kunden vorhanden</p>
                  <p className="text-sm text-gray-500">
                    Bitte erstellen Sie zuerst einen Kunden unter "Kunden"
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCustomer?.id === customer.id
                          ? 'border-primary bg-accent-light'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                          {customer.company && (
                            <p className="text-sm text-gray-600">{customer.company}</p>
                          )}
                          {customer.address && (
                            <p className="text-sm text-gray-500 mt-1">{customer.address}</p>
                          )}
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <Check size={24} className="text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Projektangaben erfassen
              </h3>

              <div className="bg-accent-light p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-800">Ausgewählter Kunde:</p>
                <p className="text-lg font-semibold text-gray-900">{selectedCustomer?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projektname / Kundenname *
                </label>
                <input
                  type="text"
                  required
                  value={projectData.customer_name}
                  onChange={(e) => setProjectData({ ...projectData, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="z.B. Max Mustermann - Wohnzimmer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projektadresse *
                </label>
                <input
                  type="text"
                  required
                  value={projectData.address}
                  onChange={(e) => setProjectData({ ...projectData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Musterstrasse 123, 8000 Zürich"
                />
              </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bereich (Scope) *
        </label>
        <div className="flex gap-3">
          <label className={`px-4 py-2 rounded-lg border cursor-pointer ${projectData.scope==='innen' ? 'border-primary bg-accent-light' : 'border-gray-300'}`}>
            <input type="radio" name="scope" value="innen" className="hidden"
              checked={projectData.scope==='innen'}
              onChange={() => setProjectData({ ...projectData, scope: 'innen' })}
            />
            Innenarbeiten
          </label>
          <label className={`px-4 py-2 rounded-lg border cursor-pointer ${projectData.scope==='aussen' ? 'border-primary bg-accent-light' : 'border-gray-300'}`}>
            <input type="radio" name="scope" value="aussen" className="hidden"
              checked={projectData.scope==='aussen'}
              onChange={() => setProjectData({ ...projectData, scope: 'aussen' })}
            />
            Aussenarbeiten
          </label>
        </div>
      </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  value={projectData.notes}
                  onChange={(e) => setProjectData({ ...projectData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Zusätzliche Informationen zum Projekt..."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="bg-accent-light rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Projekt wird erstellt...
              </h3>
              <p className="text-gray-600 mb-6">
                Sie können jetzt mit dem Ausmass beginnen
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep(step - 1);
              }
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {step === 1 ? (
              'Abbrechen'
            ) : (
              <>
                <ChevronLeft size={20} />
                Zurück
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Weiter
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? 'Erstelle Projekt...' : 'Mit Ausmass beginnen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
