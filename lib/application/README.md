# Application Layer

This folder contains use cases (application services) that orchestrate domain objects.

## Structure

- `use-cases/` - Individual use case classes
- `services/` - Application services that coordinate multiple use cases

## Rules

1. **Thin layer** - Only orchestration, no business logic
2. **One use case = One file** - Keep use cases focused
3. **Depends on domain** - Can use domain objects but not infrastructure directly
4. **Ports pattern** - Use interfaces for infrastructure dependencies
