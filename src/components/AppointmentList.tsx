import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, User } from 'lucide-react';
import { supabase, type Appointment, type Customer } from '../lib/supabase';

interface AppointmentListProps {
  onSelectAppointment: (appointment: Appointment) => void;
  onNewAppointment: () => void;
}

interface AppointmentWithCustomer extends Appointment {
  customer?: Customer | null;
}

const statusLabels = {
  geplant: 'Geplant',
  bestaetigt: 'Bestätigt',
  abgeschlossen: 'Abgeschlossen',
  abgesagt: 'Abgesagt'
};

const statusColors = {
  geplant: 'bg-gray-100 text-gray-800',
  bestaetigt: 'bg-accent-light text-primary',
  abgeschlossen: 'bg-accent text-primary-dark',
  abgesagt: 'bg-secondary-light text-secondary-dark'
};

export function AppointmentList({ onSelectAppointment, onNewAppointment }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<AppointmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      const customerIds = [...new Set(appointmentsData?.map(a => a.customer_id).filter(Boolean))];

      let customersMap: Record<string, Customer> = {};
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('*')
          .in('id', customerIds);

        if (customersData) {
          customersMap = customersData.reduce((acc, customer) => {
            acc[customer.id] = customer;
            return acc;
          }, {} as Record<string, Customer>);
        }
      }

      const appointmentsWithCustomers = appointmentsData?.map(appointment => ({
        ...appointment,
        customer: appointment.customer_id ? customersMap[appointment.customer_id] : null
      })) || [];

      setAppointments(appointmentsWithCustomers);
    } catch (error) {
      console.error('Fehler beim Laden der Termine:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatTime(timeString: string | null): string {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Termine...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Termine</h2>
        <button
          onClick={onNewAppointment}
          className="btn-primary"
        >
          <Plus size={20} />
          Neuer Termin
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Noch keine Termine vorhanden</p>
          <button
            onClick={onNewAppointment}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ersten Termin erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => onSelectAppointment(appointment)}
              className="card hover:shadow-xl transition-shadow cursor-pointer p-6"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {appointment.title}
                  </h3>

                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{formatDate(appointment.appointment_date)}</span>
                      {appointment.appointment_time && (
                        <>
                          <Clock size={16} className="ml-2" />
                          <span>{formatTime(appointment.appointment_time)} Uhr ({appointment.duration_minutes} Min.)</span>
                        </>
                      )}
                    </div>

                    {appointment.customer && (
                      <div className="flex items-center gap-2">
                        <User size={16} />
                        <span>{appointment.customer.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[appointment.status]}`}>
                  {statusLabels[appointment.status]}
                </span>
              </div>

              {appointment.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {appointment.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
