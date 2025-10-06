import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, FileText, Trash2, Send, Search } from 'lucide-react';
import { supabase, type Project } from '../lib/supabase';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

const statusLabels = {
  offeriert: 'Offeriert',
  ausfuehrung: 'Ausführung',
  abgeschlossen: 'Abgeschlossen'
};

const statusColors = {
  offeriert: 'bg-accent-light text-primary border-2 border-accent',
  ausfuehrung: 'bg-amber-100 text-amber-800 border-2 border-amber-300',
  abgeschlossen: 'bg-accent text-primary-dark border-2 border-primary'
};

export function ProjectList({ onSelectProject, onNewProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(e: React.MouseEvent, projectId: string) {
    e.stopPropagation();
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      await loadProjects();
    } catch (error) {
      console.error('Fehler beim Löschen des Projekts:', error);
      alert('Fehler beim Löschen des Projekts');
    }
  }

  const filteredProjects = projects.filter(project => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.customer_name.toLowerCase().includes(searchLower) ||
      project.address.toLowerCase().includes(searchLower) ||
      (project.notes && project.notes.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Projekte...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Projekte</h2>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={20} />
          Neues Projekt
        </button>
      </div>

      {projects.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Projekte suchen (Kunde, Adresse, Notizen)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Noch keine Projekte vorhanden</p>
          <button
            onClick={onNewProject}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Erstes Projekt erstellen
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Search size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Keine Projekte gefunden</p>
          <p className="text-sm text-gray-500 mt-2">Versuchen Sie einen anderen Suchbegriff</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-primary-dark">
                    {project.customer_name}
                  </h3>
                  <p className="text-sm text-primary mt-1">Kunde: {project.customer_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-primary border-2 border-accent">
                    Bexio
                    {project.bexio_sent ? (
                      <Send size={14} className="text-green-600" />
                    ) : (
                      <Send size={14} className="text-gray-400" />
                    )}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Projekt löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-primary">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{project.address}</span>
                </div>

                {project.appointment_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{new Date(project.appointment_date).toLocaleDateString('de-CH')}</span>
                  </div>
                )}
              </div>

              {project.notes && (
                <p className="mt-3 text-sm text-primary/70 line-clamp-2">
                  {project.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
