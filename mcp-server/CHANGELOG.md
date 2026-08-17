# Changelog

All notable changes to the standalone Python MCP server are documented here.

## [2.0.0] - 2026-08-17

### Changed

- Replaced the third-party FastMCP runtime and MCP SDK 1 dependency chain with
  the official `mcp>=2,<3` SDK and `MCPServer`.
- Declared the Python package as version 2.0.0 to make the SDK/runtime break
  explicit; MCP SDK 1 and the legacy FastMCP import path are no longer supported.
- Moved development dependencies to the standard uv `dev` dependency group.
- Kept the standalone stdio container runtime-only with frozen, no-dev installs;
  removed unused port settings and disabled attempts to launch the uncopied Web app.
- Fixed the container build context so Hatch can read its declared README metadata.

### Added

- Added a direct SDK 2 client smoke that explicitly negotiates protocol
  `2026-07-28`, validates all 23 tools, and calls an offline-safe tool.
- Added a real stdio subprocess smoke covering the packaged module entry point.
- Added Python 3.10 and 3.13 CI gates for frozen installation, protocol smokes,
  package builds, and the standalone container build.
