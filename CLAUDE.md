# CutBoard

Cutting phase tracker app - Next.js 15, React 19, Tailwind CSS 4, TypeScript.
German UI. Mobile-first design.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build - RUN BEFORE EVERY COMMIT
npm run lint     # ESLint check
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS 4 (dark theme, zinc palette)
- **State**: React Context (`/src/lib/data-store.tsx`)
- **Database**: Turso (LibSQL)
- **Storage**: Vercel Blob (photos)
- **Charts**: Recharts

## Project Structure

```
src/
├── app/           # Pages (App Router)
│   ├── page.tsx   # Dashboard - daily overview, meals, stats
│   ├── weight/    # Weight tracking with trend chart
│   ├── photos/    # Progress photos with camera overlay
│   ├── shopping/  # Shopping list from meal plan
│   └── settings/  # Profile settings
├── components/    # Shared components (Card, Button, BottomNav)
└── lib/
    ├── data-store.tsx  # Central state (useData hook)
    └── mealPlan.ts     # Meal definitions (Tag A & Tag B)
```

## Code Style

- TypeScript with strict types
- Tailwind for all styling (no CSS files)
- ES modules (`import/export`), not CommonJS
- German UI text, English code/comments
- Prefer editing existing files over creating new ones
- Keep changes minimal and focused

## Workflow

1. Create branch from main
2. Implement changes
3. `npm run build` - MUST pass
4. Commit with clear message
5. Push → auto-PR via GitHub Action

## Don'ts

- Don't add comments/docs unless necessary
- Don't refactor unrelated code
- Don't add unrequested features
- Don't create new files unless required
- Don't use inline styles (use Tailwind)
