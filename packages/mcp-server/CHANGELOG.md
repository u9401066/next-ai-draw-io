# Changelog

All notable changes to the standalone TypeScript MCP server are documented here.

## [0.2.0] - 2026-08-17

### Changed

- Replaced the MCP TypeScript SDK 1 monolith with the official SDK 2
  `@modelcontextprotocol/server` runtime package.
- Raised the minimum Node.js version from 18 to 20, matching the SDK 2 runtime
  contract.

### Added

- Added a direct in-memory and stdio subprocess smoke suite pinned to the
  `2026-07-28` protocol revision.
- Added CI gates that reject MCP SDK 1 and FastMCP runtime paths.
