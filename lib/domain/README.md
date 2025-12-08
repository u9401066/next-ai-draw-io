# Domain Layer

This folder contains the core business logic of the application.

## Structure

- `diagram/` - Diagram aggregate root
- `checkpoint/` - Checkpoint aggregate root (for undo/redo)
- `preset/` - Drawing preset value objects
- `shared/` - Shared value objects and base classes

## Rules

1. **No external dependencies** - Domain layer should not depend on infrastructure or presentation
2. **Pure business logic** - No I/O, no side effects
3. **Rich domain models** - Behavior belongs in entities, not services
