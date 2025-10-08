import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard as Edit, Trash2, Plus, FileText, Home, BedDouble, DoorOpen, Navigation, ChefHat, Bath, Archive, Warehouse, Package, Copy } from 'lucide-react';
import { supabase, type Project, type Room } from '../lib/supabase';
import { RoomDetail } from './RoomDetail';
import { MeasurementSummary } from './MeasurementSummary';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}

export function ProjectDetail({ project, onBack, onEdit, onUpdate }: ProjectDetailProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showNewRoomForm, setShowNewRoomForm] = useState(false);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [customRoomName, setCustomRoomName] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  const scope = (project as any).scope === 'aussen' ? 'aussen' : 'innen';
  const predefinedRooms = scope === 'aussen'
    ? [
        { name: 'Holzuntersicht', icon: Home },
        { name: 'Betonuntersicht', icon: Home },
        { name: 'Fassadenflächen', icon: Home },
        { name: 'Betonflächen', icon: Home },
        { name: 'Sockel', icon: Warehouse },
        { name: 'Fenster', icon: DoorOpen },
        { name: 'Türe', icon: DoorOpen },
        { name: 'Abdeckarbeiten', icon: Archive },
        { name: 'Holzfassadenfläche', icon: Home },
        { name: 'Ethernitplatten', icon: Package },
        { name: 'Eigener Raum', icon: Plus },
      ]
    : [
        { name: 'Wohnzimmer', icon: Home },
        { name: 'Schlafzimmer', icon: BedDouble },
        { name: 'Zimmer', icon: DoorOpen },
        { name: 'Korridor', icon: Navigation },
        { name: 'Küche', icon: ChefHat },
        { name: 'Badezimmer', icon: Bath },
        { name: 'Reduit', icon: Archive },
        { name: 'Keller', icon: Warehouse },
        { name: 'Abstellraum', icon: Package },
        { name: 'Abdeckarbeiten', icon: Archive },
        { name: 'Eigener Raum', icon: Plus },
      ];

  useEffect(() => {
    loadRooms();
  }, [project.id]);

  async function loadRooms() {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Räume:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRoomNameWithNumber(baseName: string): string {
    const existingRooms = rooms.filter(room =>
      room.name === baseName || room.name.match(new RegExp(`^${baseName} \\d+$`))
    );

    if (existingRooms.length === 0) {
      return baseName;
    }

    return `${baseName} ${existingRooms.length + 1}`;
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();

    // Eigener Raum als Einzel-Case
    if (selectedRoomTypes.includes('Eigener Raum')) {
      if (!customRoomName.trim()) return;
      const roomName = customRoomName.trim();
      try {
        const { error } = await supabase.from('rooms').insert([{ project_id: project.id, name: roomName, sort_order: rooms.length }]);
        if (error) throw error;
      } catch (error) {
        console.error('Fehler beim Erstellen des Raums:', error);
      }
    } else {
      if (selectedRoomTypes.length === 0) return;
      const payload = selectedRoomTypes.map((type, idx) => ({
        project_id: project.id,
        name: getRoomNameWithNumber(type),
        sort_order: rooms.length + idx,
      }));
      try {
        const { error } = await supabase.from('rooms').insert(payload);
        if (error) throw error;
      } catch (error) {
        console.error('Fehler beim Erstellen der Räume:', error);
      }
    }

    // reset
    setSelectedRoomTypes([]);
    setCustomRoomName('');
    setShowNewRoomForm(false);
    loadRooms();
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Möchten Sie diesen Raum wirklich löschen? Alle Ausmasse werden ebenfalls gelöscht.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      loadRooms();
    } catch (error) {
      console.error('Fehler beim Löschen des Raums:', error);
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen? Alle Räume und Ausmasse werden ebenfalls gelöscht.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Fehler beim Löschen des Projekts:', error);
    }
  }

  async function handleDuplicateProject() {
    try {
      // Neues Projekt anlegen (Kopie)
      const base = {
        customer_id: project.customer_id,
        customer_name: `${project.customer_name} (Kopie)`,
        address: project.address,
        status: project.status,
        appointment_date: project.appointment_date,
        notes: project.notes,
        scope: (project as any).scope || null,
      } as any;

      const { data: inserted, error: projErr } = await supabase
        .from('projects')
        .insert([base])
        .select('*')
        .single();
      if (projErr) throw projErr;

      // Räume kopieren (ohne measurements, nur Struktur)
      if (rooms.length > 0) {
        const payload = rooms.map((r) => ({
          project_id: inserted.id,
          name: r.name,
          sort_order: r.sort_order,
        }));
        const { error: roomsErr } = await supabase.from('rooms').insert(payload);
        if (roomsErr) throw roomsErr;
      }

      onUpdate();
      onBack();
      alert('Projekt wurde dupliziert.');
    } catch (error) {
      console.error('Duplizieren fehlgeschlagen:', error);
      alert('Duplizieren fehlgeschlagen');
    }
  }

  if (selectedRoom) {
    return (
      <RoomDetail
        room={selectedRoom}
        onBack={() => {
          setSelectedRoom(null);
          loadRooms();
        }}
      />
    );
  }

  if (showSummary) {
    return (
      <MeasurementSummary
        project={project}
        rooms={rooms}
        onBack={() => setShowSummary(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSummary(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-black hover:bg-emerald-300 transition-colors"
          >
            <FileText size={20} />
            Zusammenfassung
          </button>
          <button
            onClick={handleDuplicateProject}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-black transition-colors"
          >
            <Copy size={18} />
            Als Vorlage duplizieren
          </button>
          <button
            onClick={onEdit}
            className="btn-primary rounded-full"
          >
            <Edit size={20} />
            Bearbeiten
          </button>
          <button
            onClick={handleDeleteProject}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white hover:bg-secondary-dark transition-colors"
          >
            <Trash2 size={20} />
            Löschen
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{project.customer_name}</h1>
        <div className="space-y-2 text-gray-600">
          <p><strong>Adresse:</strong> {project.address}</p>
          <p><strong>Status:</strong> {project.status === 'offeriert' ? 'Offeriert' : project.status === 'ausfuehrung' ? 'Ausführung' : 'Abgeschlossen'}</p>
          {project.appointment_date && (
            <p><strong>Termin:</strong> {new Date(project.appointment_date).toLocaleDateString('de-CH')}</p>
          )}
          {project.notes && (
            <p className="mt-4"><strong>Notizen:</strong><br />{project.notes}</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{(project as any).scope === 'aussen' ? 'Bereiche' : 'Räume'}</h2>
          <button
            onClick={() => setShowNewRoomForm(true)}
            className="btn-primary rounded-full"
          >
            <Plus size={20} />
            {(project as any).scope === 'aussen' ? 'Bereich hinzufügen' : 'Raum hinzufügen'}
          </button>
        </div>

        {showNewRoomForm && (
          <form onSubmit={handleAddRoom} className="mb-6 bg-gradient-to-br from-emerald-50 to-white p-6 rounded-xl border border-emerald-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Raumtyp auswählen
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {predefinedRooms.map((room) => {
                    const Icon = room.icon;
                    const isSelected = selectedRoomTypes.includes(room.name);
                    return (
                      <button
                        key={room.name}
                        type="button"
                        onClick={() => {
                          setSelectedRoomTypes(prev => (
                            prev.includes(room.name)
                              ? prev.filter(n => n !== room.name)
                              : [...prev, room.name]
                          ));
                        }}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:shadow-sm'
                        }`}
                      >
                        <Icon size={20} className={isSelected ? 'text-white' : 'text-primary'} />
                        <span className="font-medium text-sm">{room.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedRoomTypes.includes('Eigener Raum') && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Raumname eingeben
                  </label>
                  <input
                    type="text"
                    value={customRoomName}
                    onChange={(e) => setCustomRoomName(e.target.value)}
                    placeholder="z.B. Wintergarten, Büro, etc."
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm bg-white"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={selectedRoomTypes.length === 0 || (selectedRoomTypes.includes('Eigener Raum') && !customRoomName.trim())}
                  className="flex-1 btn-primary justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  {(project as any).scope === 'aussen' ? 'Bereich hinzufügen' : 'Raum hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRoomForm(false);
                    setSelectedRoomTypes([]);
                    setCustomRoomName('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Lade Räume...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">Noch keine Räume vorhanden. Fügen Sie den ersten Raum hinzu.</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => setSelectedRoom(room)}
                  className="flex-1 text-left font-medium text-black hover:text-primary"
                >
                  {room.name}
                </button>
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="text-secondary hover:text-secondary-dark p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
