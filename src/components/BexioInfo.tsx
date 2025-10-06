import { CheckCircle } from 'lucide-react';

export function BexioInfo() {
  return (
    <div className="bg-accent-light border-2 border-accent rounded-lg p-6">
      <div className="flex items-start gap-3">
        <CheckCircle size={24} className="text-primary flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-black mb-2">
            Bexio-Integration aktiv
          </h3>
          <p className="text-gray-800 mb-4">
            Die Bexio-Integration ist vollständig konfiguriert und einsatzbereit!
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-black mb-1">So nutzen Sie die Integration:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                <li>Erstellen Sie ein Projekt mit Kundendaten</li>
                <li>Erfassen Sie die Räume und Ausmasse</li>
                <li>Öffnen Sie die Zusammenfassung</li>
                <li>Klicken Sie auf "Zu Bexio übertragen"</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-black mb-1">Was wird synchronisiert:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                <li>Projekte werden als Offerten in Bexio erstellt</li>
                <li>Alle Ausmass-Positionen werden übertragen</li>
                <li>Kunden werden automatisch angelegt oder verknüpft</li>
                <li>Alle Räume und Kategorien werden strukturiert dargestellt</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-white rounded border border-accent">
              <p className="text-sm text-black font-medium mb-2">
                Hinweis:
              </p>
              <p className="text-sm text-gray-800">
                Die Bexio-Integration nutzt eine sichere Serverless-Funktion.
                Ihr API-Token wird niemals im Browser gespeichert oder angezeigt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
