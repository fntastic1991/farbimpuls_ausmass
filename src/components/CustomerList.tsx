import { useState, useEffect } from 'react';
import { Plus, Mail, Phone, MapPin, Briefcase, Users, Download } from 'lucide-react';
import { supabase, type Customer } from '../lib/supabase';

interface CustomerListProps {
  onSelectCustomer: (customer: Customer) => void;
  onNewCustomer: () => void;
}

export function CustomerList({ onSelectCustomer, onNewCustomer }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

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
      setLoading(false);
    }
  }

  async function importFromBexio() {
    setImporting(true);
    setImportMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-bexio-customers`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }

      setImportMessage(result.message);
      await loadCustomers();

      setTimeout(() => setImportMessage(''), 5000);
    } catch (error) {
      console.error('Fehler beim Import:', error);
      setImportMessage(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setTimeout(() => setImportMessage(''), 5000);
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Kunden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Kunden</h2>
        <div className="flex gap-3">
          <button
            onClick={importFromBexio}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-gray-800 hover:bg-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            {importing ? 'Importiere...' : 'Von Bexio importieren'}
          </button>
          <button
            onClick={onNewCustomer}
            className="btn-primary rounded-full"
          >
            <Plus size={20} />
            Neuer Kunde
          </button>
        </div>
      </div>

      {importMessage && (
        <div className={`p-4 rounded-lg ${
          importMessage.startsWith('Fehler')
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {importMessage}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Noch keine Kunden vorhanden</p>
          <button
            onClick={onNewCustomer}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Ersten Kunden erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className="card hover:shadow-xl transition-shadow cursor-pointer p-6"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {customer.name}
                  </h3>
                  {customer.company && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Briefcase size={16} />
                      <span>{customer.company}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-gray-600 text-sm">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{customer.email}</span>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span>{customer.phone}</span>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{customer.address}</span>
                  </div>
                )}
              </div>

              {customer.notes && (
                <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                  {customer.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
