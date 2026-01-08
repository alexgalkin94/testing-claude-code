# CutBoard

Eine mobile-first Web-App zum Tracken deiner Cutting-Phase. Verfolge dein Gewicht, mache Fortschrittsfotos und bleib auf Kurs mit deinem Kalorienziel.

## Features

- **Dashboard** - Tagesübersicht mit Mahlzeiten, Kalorien und Makros
- **Gewichtstracking** - Tägliche Gewichtseinträge mit Trend- und Zielkurve
- **Fortschrittsfotos** - Kamera mit Körper-Overlay für konsistente Bilder
- **Einkaufsliste** - Automatisch generiert aus dem Mahlzeitenplan
- **Statistiken** - Verloren, vs. Plan, TDEE-Schätzung

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) für Diagramme
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) für Foto-Speicherung
- [Turso](https://turso.tech/) (LibSQL) für Datenbank

## Lokale Entwicklung

### Voraussetzungen

- Node.js 18+
- npm oder pnpm

### Installation

```bash
# Repository klonen
git clone https://github.com/alexgalkin94/cutboard.git
cd cutboard

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# Dann .env mit deinen Werten ausfüllen

# Entwicklungsserver starten
npm run dev
```

Die App läuft dann auf [http://localhost:3000](http://localhost:3000).

### Umgebungsvariablen

Siehe `.env.example` für benötigte Variablen:

- `TURSO_DATABASE_URL` - Turso Datenbank URL
- `TURSO_AUTH_TOKEN` - Turso Auth Token
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Token

## Scripts

```bash
npm run dev      # Entwicklungsserver
npm run build    # Production Build
npm run start    # Production Server
npm run lint     # ESLint
```

## Projektstruktur

```
src/
├── app/
│   ├── api/          # API Routes
│   ├── photos/       # Fortschrittsfotos
│   ├── settings/     # Einstellungen
│   ├── shopping/     # Einkaufsliste
│   ├── weight/       # Gewichtstracking
│   └── page.tsx      # Dashboard
├── components/       # React Komponenten
└── lib/
    ├── data-store.tsx  # State Management
    └── mealPlan.ts     # Mahlzeitenplan
```

## Lizenz

MIT
