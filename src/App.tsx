import { useEffect, useState } from 'react';
import { Navigation } from './components/Navigation';
import { Login } from './components/Login';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { ProjectWizard } from './components/ProjectWizard';
import { ProjectDetail } from './components/ProjectDetail';
import { CustomerList } from './components/CustomerList';
import { CustomerForm } from './components/CustomerForm';
import { AppointmentList } from './components/AppointmentList';
import { AppointmentForm } from './components/AppointmentForm';
import { Settings } from './components/Settings';
import { supabase } from './lib/supabase';
import type { Project, Customer, Appointment } from './lib/supabase';

type MainView = 'projekte' | 'kunden' | 'termine' | 'einstellungen';
type ProjectView = 'list' | 'detail';

function App() {
  const [session, setSession] = useState<any>(null);
  const ALLOWED_UID = '39f24458-b858-4109-8dd6-7dc257a0e77e';
  const [mainView, setMainView] = useState<MainView>('projekte');
  useEffect(()=>{
    supabase.auth.getSession().then(({ data })=> setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess)=> setSession(sess));
    return () => { listener.subscription.unsubscribe(); };
  },[]);
  const [projectView, setProjectView] = useState<ProjectView>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  function handleNavigate(view: MainView) {
    setMainView(view);
    setProjectView('list');
    setSelectedProject(null);
    setSelectedCustomer(null);
    setSelectedAppointment(null);
  }

  function handleSelectProject(project: Project) {
    setSelectedProject(project);
    setProjectView('detail');
  }

  function handleBackToProjects() {
    setSelectedProject(null);
    setProjectView('list');
    setRefreshKey(prev => prev + 1);
  }

  function handleNewProject() {
    setShowProjectWizard(true);
  }

  async function handleWizardComplete(projectId: string) {
    setShowProjectWizard(false);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedProject(data);
        setProjectView('detail');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Projekts:', error);
    }

    setRefreshKey(prev => prev + 1);
  }

  function handleCloseWizard() {
    setShowProjectWizard(false);
  }

  function handleEditProject() {
    setEditingProject(selectedProject);
    setShowProjectForm(true);
  }

  function handleSaveProject() {
    setShowProjectForm(false);
    setEditingProject(null);
    setRefreshKey(prev => prev + 1);

    if (editingProject && selectedProject) {
      handleBackToProjects();
    }
  }

  function handleCloseProjectForm() {
    setShowProjectForm(false);
    setEditingProject(null);
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  }

  function handleNewCustomer() {
    setEditingCustomer(null);
    setShowCustomerForm(true);
  }

  function handleSaveCustomer() {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    setSelectedCustomer(null);
    setRefreshKey(prev => prev + 1);
  }

  function handleCloseCustomerForm() {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    setSelectedCustomer(null);
  }

  function handleSelectAppointment(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
  }

  function handleNewAppointment() {
    setEditingAppointment(null);
    setShowAppointmentForm(true);
  }

  function handleSaveAppointment() {
    setShowAppointmentForm(false);
    setEditingAppointment(null);
    setSelectedAppointment(null);
    setRefreshKey(prev => prev + 1);
  }

  function handleCloseAppointmentForm() {
    setShowAppointmentForm(false);
    setEditingAppointment(null);
    setSelectedAppointment(null);
  }

  if (!session) return <Login onSuccess={()=>setSession(true)} />;

  if (session?.user?.id && session.user.id !== ALLOWED_UID) {
    return (
      <div className="min-h-screen app-gradient flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Kein Zugriff</h1>
          <p className="text-gray-600">Dieses Konto ist für diese Anwendung nicht freigeschaltet.</p>
          <button
            onClick={()=>supabase.auth.signOut()}
            className="touch-btn bg-primary text-white w-full"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation activeView={mainView} onNavigate={handleNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mainView === 'projekte' && projectView === 'list' && (
          <ProjectList
            key={refreshKey}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
          />
        )}

        {mainView === 'projekte' && projectView === 'detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={handleBackToProjects}
            onEdit={handleEditProject}
            onUpdate={handleBackToProjects}
          />
        )}

        {mainView === 'kunden' && (
          <CustomerList
            key={refreshKey}
            onSelectCustomer={handleSelectCustomer}
            onNewCustomer={handleNewCustomer}
          />
        )}

        {mainView === 'termine' && (
          <AppointmentList
            key={refreshKey}
            onSelectAppointment={handleSelectAppointment}
            onNewAppointment={handleNewAppointment}
          />
        )}

        {mainView === 'einstellungen' && <Settings />}

        {showProjectWizard && (
          <ProjectWizard
            onClose={handleCloseWizard}
            onComplete={handleWizardComplete}
          />
        )}

        {showProjectForm && (
          <ProjectForm
            project={editingProject}
            onClose={handleCloseProjectForm}
            onSave={handleSaveProject}
          />
        )}

        {showCustomerForm && (
          <CustomerForm
            customer={editingCustomer}
            onClose={handleCloseCustomerForm}
            onSave={handleSaveCustomer}
          />
        )}

        {showAppointmentForm && (
          <AppointmentForm
            appointment={editingAppointment}
            onClose={handleCloseAppointmentForm}
            onSave={handleSaveAppointment}
          />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span>Bexio-Integration:</span>
            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Aktiv
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
