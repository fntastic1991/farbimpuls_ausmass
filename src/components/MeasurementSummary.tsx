import { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase, type Project, type Room, type Measurement, type MeasurementCategory, type MeasurementUnit, type CategorySetting } from '../lib/supabase';

interface MeasurementSummaryProps {
  project: Project;
  rooms: Room[];
  onBack: () => void;
}

interface RoomWithMeasurements extends Room {
  measurements: Measurement[];
}

const unitLabels: Record<MeasurementUnit, string> = {
  'm2': 'm²',
  'lfm': 'lfm',
  'stk': 'Stk.'
};

export function MeasurementSummary({ project, rooms, onBack }: MeasurementSummaryProps) {
  const [roomsWithMeasurements, setRoomsWithMeasurements] = useState<RoomWithMeasurements[]>([]);
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllMeasurements();
    loadCategories();
  }, [rooms]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('category_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  }

  async function loadAllMeasurements() {
    try {
      const roomsData: RoomWithMeasurements[] = [];

      for (const room of rooms) {
        const { data, error } = await supabase
          .from('measurements')
          .select('*')
          .eq('room_id', room.id)
          .order('category', { ascending: true });

        if (error) throw error;

        roomsData.push({
          ...room,
          measurements: data || []
        });
      }

      setRoomsWithMeasurements(roomsData);
    } catch (error) {
      console.error('Fehler beim Laden der Ausmasse:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCategoryTotals() {
    const totals: Record<string, Record<string, number>> = {};

    roomsWithMeasurements.forEach(room => {
      room.measurements.forEach(m => {
        const key = `${m.category}_${m.unit}`;
        if (!totals[key]) {
          totals[key] = {
            category: m.category,
            unit: m.unit,
            total: 0
          };
        }
        totals[key].total += m.quantity;
      });
    });

    return Object.values(totals);
  }

  async function exportToPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    // Logo links oben
    try {
      const logo = document.querySelector('img[alt="logo"], img[aria-label="logo"]') as HTMLImageElement | null;
      if (logo) {
        const canvas = await html2canvas(logo, { backgroundColor: null });
        const dataUrl = canvas.toDataURL('image/png');
        doc.addImage(dataUrl, 'PNG', 40, y - 20, 120, 40);
      }
    } catch {}

    // Kopf
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Ausmass-Zusammenfassung', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Projekt: ${project.customer_name}`, 40, (y += 18));
    doc.text(`Adresse: ${project.address}`, 40, (y += 14));
    doc.text(`Datum: ${new Date().toLocaleDateString('de-CH')}`, 40, (y += 14));
    y += 20;

    const addLine = (text: string, size = 11, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, pageWidth - 80);
      doc.text(lines, 40, y);
      y += lines.length * (size + 4);
    };

    // Räume
    roomsWithMeasurements.forEach(room => {
      if (room.measurements.length === 0) return;
      addLine(room.name, 13, true);

      const grouped = room.measurements.reduce((acc, m) => {
        if (!acc[m.category]) acc[m.category] = [];
        acc[m.category].push(m);
        return acc;
      }, {} as Record<string, Measurement[]>);

      Object.entries(grouped).forEach(([category, items]) => {
        const total = items.reduce((sum, item) => sum + item.quantity, 0);
        const catLabel = categories.find(c => c.category === category)?.category || category;
        addLine(`${catLabel} (Total: ${total.toFixed(2)} ${unitLabels[items[0].unit]})`, 12, true);

        items.forEach(item => {
          addLine(item.description || '', 11, false);
          const dims: string[] = [];
          if (item.length) dims.push(`L: ${item.length} m`);
          if (item.width) dims.push(`B: ${item.width} m`);
          if (item.height) dims.push(`H: ${item.height} m`);
          const right = `${item.quantity} ${unitLabels[item.unit]}`;
          if (dims.length) addLine(dims.join('  ·  '), 10, false);
          if (item.notes) addLine(item.notes, 10, false);
          addLine(right, 11, true);
          y += 6;
        });
        y += 6;
      });
      y += 8;
    });

    // Gesamtübersicht
    addLine('Gesamtübersicht', 13, true);
    getCategoryTotals().forEach(t => {
      const catLabel = categories.find(c => c.category === t.category)?.category || t.category;
      addLine(`${catLabel}: ${t.total.toFixed(2)} ${unitLabels[t.unit as MeasurementUnit]}`, 11, false);
    });

    doc.save(`ausmass_${project.customer_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async function syncToBexio() {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-bexio`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ projectId: project.id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.failCount > 0) {
          console.error('Bexio Fehler Details:');
          console.error('Vollständige Antwort:', data);
          console.error('Fehler-Array:', data.errors);
          data.errors?.forEach((err: any, idx: number) => {
            console.error(`Fehler ${idx + 1}:`, {
              status: err.status,
              payload: err.payload,
              error: err.error,
              errorDetails: err.error
            });
          });
          setSyncMessage({
            type: 'error',
            text: `Offerte erstellt (Nr. ${data.quoteNumber}), aber ${data.failCount} von ${data.positionsCount} Positionen fehlgeschlagen. Siehe Browser-Console für Details.`
          });
        } else {
          setSyncMessage({
            type: 'success',
            text: `Erfolgreich zu Bexio übertragen! Offerte Nr. ${data.quoteNumber || data.quoteId}`
          });
        }
      } else {
        console.error('Vollständige Fehlerantwort:', data);
        setSyncMessage({
          type: 'error',
          text: data.error || 'Fehler beim Übertragen zu Bexio'
        });
      }
    } catch (error) {
      console.error('Fehler beim Sync:', error);
      setSyncMessage({
        type: 'error',
        text: 'Verbindungsfehler zu Bexio'
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Zusammenfassung...</div>
      </div>
    );
  }

  const totals = getCategoryTotals();

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

        <div className="flex gap-3">
          <button
            onClick={syncToBexio}
            disabled={syncing}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
            {syncing ? 'Übertrage...' : 'Zu Bexio übertragen'}
          </button>
          <button
            onClick={exportToPdf}
            className="flex items-center gap-2 bg-accent text-black px-4 py-2 rounded-lg hover:bg-accent-dark transition-colors"
          >
            <Download size={20} />
            Als PDF exportieren
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`rounded-lg p-4 ${
          syncMessage.type === 'success'
            ? 'bg-accent-light border-2 border-accent text-primary-dark'
            : 'bg-secondary-light border-2 border-secondary text-secondary-dark'
        }`}>
          <p className="font-medium">{syncMessage.text}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText size={32} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Ausmass-Zusammenfassung</h1>
            <p className="text-gray-600">{project.customer_name}</p>
          </div>
        </div>
      </div>

      <div className="bg-accent-light rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gesamtübersicht</h2>
        {totals.length === 0 ? (
          <p className="text-gray-600">Noch keine Ausmasse erfasst.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {totals.map((t, idx) => {
              const catLabel = categories.find(c => c.category === t.category)?.category || t.category;
              return (
              <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-700 mb-1">
                  {catLabel}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {t.total.toFixed(2)} {unitLabels[t.unit as MeasurementUnit]}
                </p>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {roomsWithMeasurements.map(room => {
        if (room.measurements.length === 0) return null;

        const grouped = room.measurements.reduce((acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m);
          return acc;
        }, {} as Record<string, Measurement[]>);

        return (
          <div key={room.id} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{room.name}</h2>

            <div className="space-y-6">
              {Object.entries(grouped).map(([category, items]) => {
                const total = items.reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
                      <span>{categories.find(c => c.category === category)?.category || category}</span>
                      <span className="text-primary">
                        {total.toFixed(2)} {unitLabels[items[0].unit]}
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{item.description}</p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              {item.length && <span>L: {item.length} m</span>}
                              {item.width && <span>B: {item.width} m</span>}
                              {item.height && <span>H: {item.height} m</span>}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                            )}
                          </div>
                          <span className="font-medium text-primary">
                            {item.quantity} {unitLabels[item.unit]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="bg-accent rounded-lg p-6 border-2 border-accent-dark">
        <h3 className="text-lg font-semibold text-black mb-2">Bexio-Integration aktiv</h3>
        <p className="text-gray-800">
          Die Bexio-Integration ist vollständig konfiguriert. Klicken Sie auf "Zu Bexio übertragen",
          um dieses Ausmass automatisch als Offerte in Bexio zu erstellen. Der Kunde wird dabei
          automatisch angelegt oder verknüpft.
        </p>
      </div>
    </div>
  );
}
