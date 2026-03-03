# TuningHub

TuningHub war eine spezialisierte Plattform für Moped- und Tuning-Enthusiasten mit über 500 Nutzern, auf der Nutzer Teile mit Bild und Telefonnummer inserieren und direkt verkaufen konnten.  
Die Plattform richtete sich vor allem an Fahrer von Simson, 50ccm-Mopeds und Tuning-Fans im deutschsprachigen Raum.  
Hinweis: Die Plattform ist mittlerweile offline und wird sehr wahrscheinlich nicht wieder online gehen.

---

## Vision

TuningHub hatte das Ziel, eine zentrale Plattform für den privaten An- und Verkauf von Moped-Teilen zu sein, einfach, direkt und ohne unnötige Komplexität.

---

## Tech Stack (historisch)

### Frontend
- HTML
- CSS
- JavaScript
- Responsive Design
- Darkmode-Unterstützung

### Backend
- Supabase
  - Authentifizierung
  - PostgreSQL Datenbank
  - Storage (Bild-Upload)
  - Tracking und Analytics

### Hosting
- Netlify (Website)
- Eigene Supabase-Instanz für:
  - TuningHub
  - TuningHubDashboard (Admin-Analyse)

---

## Features (historisch)

### Benutzer
- Registrierung und Login
- Speicherung der Telefonnummer im `user_metadata`
- Account löschen und verwalten
- Eigene Inserate verwalten

### Teile inserieren
- Titel
- Beschreibung
- Preis
- Zustand
- Telefonnummer (Dropdown oder neue hinzufügen)
- Bild-Upload (mehrere möglich)
  - Bild wird automatisch in der Auflösung verringert (-> weniger Serverauslastung,kürzere Ladezeiten)
- Automatische Zuordnung zum Nutzer

### Suche und Filter
- Fuzzy Search
- Suchfunktion für Teile
- Preis-Anzeige
- Bild-Vorschau
- Direkter Kontakt per Telefonnummer

### Admin-Dashboard (TuningHubDashboard)
- Login-geschützt
- Eigene Supabase-Instanz
- Tracking von:
  - Logins
  - Neue Accounts
  - Neue Inserate
  - Verkäufe
  - Klicks auf Teile
  - Gelöschte Accounts
- Filter nach:
  - Diese Stunde
  - Letzte 24 Stunden
  - Letzte 7 Tage
  - Letzter Monat
  - Letztes Jahr
  - Gesamt

---

## Sicherheit (historisch)

- Supabase Auth mit JWT
- Row Level Security (RLS)
- Nutzer sahen nur ihre eigenen Daten
- Admin-Zugriff strikt getrennt
- Separate Supabase-Instanz für Dashboard

---

## Datenstruktur (historisch)

### Tabelle: parts
- id
- user_id
- title
- description
- price
- condition
- phone
- image_url
- created_at

### Tracking-Tabelle: events
- id
- type (login, part_created, click, purchase, delete_account, etc.)
- user_id
- metadata
- created_at

---

## Roadmap (historisch)

- MVP (Testphase)
- Webseite mit grundlegenden Funktionen
- verbessertes Suchsystem (mit Rankingsystem)
- Mobile App Version (PWA)
- Push-Benachrichtigungen
- Direkte Chat-Funktion
- Performance-Optimierung
- Skalierung der Datenbank

---

## Projektstatus

TuningHub ist offline und wird sehr wahrscheinlich nicht wieder online gehen.  
Alle hier beschriebenen Features und Strukturen dienen der Dokumentation des bisherigen Projekts.

---

## Lizenz

Dieses Projekt ist proprietär und darf ohne ausdrückliche Genehmigung nicht kopiert oder weiterverwendet werden.
