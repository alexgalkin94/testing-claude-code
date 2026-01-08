# Claude Code Guidelines

## Project Overview
CutBoard - A cutting phase tracker app built with Next.js 14, Tailwind CSS, and TypeScript.
German UI language.

## Development Workflow

When implementing features:
1. Create a feature branch from main: `claude/feature-name-{random}`
2. Implement the requested changes
3. Run `npm run build` to verify no errors
4. Commit with clear, descriptive messages
5. Create a PR targeting main branch
6. Include a summary of changes and test plan in PR description

## Code Style

- Use TypeScript with strict types
- Use Tailwind CSS for styling (dark theme: zinc color palette)
- Keep components in `/src/components`
- Keep pages in `/src/app` (Next.js App Router)
- Use German for all UI text
- Prefer editing existing files over creating new ones
- Keep changes minimal and focused

## Key Files

- `/src/lib/data-store.tsx` - Central state management with React Context
- `/src/lib/mealPlan.ts` - Meal plan definitions (Tag A & Tag B)
- `/src/app/page.tsx` - Main dashboard
- `/src/app/weight/page.tsx` - Weight tracking with charts
- `/src/app/photos/page.tsx` - Progress photos with camera overlay

## Testing

Always run before committing:
```bash
npm run build
```

## Don't

- Don't add unnecessary comments or documentation
- Don't refactor unrelated code
- Don't add features that weren't requested
- Don't create new files unless necessary
