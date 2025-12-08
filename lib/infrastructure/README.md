# Infrastructure Layer

This folder contains implementations of domain interfaces and external service adapters.

## Structure

- `persistence/` - Repository implementations (localStorage, etc.)
- `drawio/` - Draw.io adapter for canvas operations
- `mcp/` - MCP API adapter

## Rules

1. **Implements domain interfaces** - Follow contracts defined in domain layer
2. **External dependencies here** - All third-party libraries wrapped here
3. **Easily swappable** - Can replace implementations without affecting domain
