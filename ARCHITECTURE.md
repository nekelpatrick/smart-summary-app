# Project Architecture

## Structure

```
apps/frontend/src/app/
├── components/           # UI components
├── hooks/               # Business logic hooks
├── types/               # TypeScript interfaces
├── config/              # Configuration
├── utils/               # Utility functions
└── page.tsx             # Main page
```

## Key Patterns

### Component Separation

- Each component has a single responsibility
- Props are typed with interfaces
- Reusable across the application

### Custom Hooks

- `useTextSummary` - Main summarization logic
- `usePasteHandler` - Paste event handling
- Separates UI from business logic

### Error Handling

- ErrorBoundary component for graceful error handling
- Consistent error states across components

### Configuration

- Centralized in `config/index.ts`
- Environment variables properly typed
- Default values provided

## Benefits

- **Maintainable**: Clear separation of concerns
- **Testable**: Isolated components and hooks
- **Type-safe**: Comprehensive TypeScript usage
- **Reusable**: Modular component structure
