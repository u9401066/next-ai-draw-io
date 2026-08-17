"""Protocol-level smoke tests for the official MCP Python SDK 2 server."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from mcp import Client, StdioServerParameters
from mcp.client.stdio import stdio_client

from drawio_mcp_server.server import mcp

PROTOCOL_VERSION = "2026-07-28"
SERVER_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_TOOLS = {
    "apply_diagram_changes",
    "close_tab",
    "create_diagram",
    "create_from_template",
    "create_tab",
    "edit_diagram",
    "export_diagram",
    "get_diagram_changes",
    "get_diagram_content",
    "get_diagram_elements",
    "get_drawing_guidelines",
    "get_style_string",
    "get_user_events",
    "get_web_status",
    "list_available_styles",
    "list_tabs",
    "list_templates",
    "load_file",
    "read_diagram",
    "save_tab",
    "start_drawio_web",
    "switch_tab",
    "sync_diagram_state",
}


async def _assert_server_contract(client: Client) -> None:
    """Verify negotiation, the complete tool surface, and one offline-safe call."""
    assert client.protocol_version == PROTOCOL_VERSION

    listed = await asyncio.wait_for(client.list_tools(), timeout=10)
    tools = {tool.name: tool for tool in listed.tools}
    assert set(tools) == EXPECTED_TOOLS
    assert all(tool.description for tool in tools.values())
    assert all(tool.input_schema.get("type") == "object" for tool in tools.values())

    result = await asyncio.wait_for(client.call_tool("list_templates", {}), timeout=10)
    assert not result.is_error
    text = "\n".join(
        block.text for block in result.content if getattr(block, "text", None)
    )
    assert "aws-3tier" in text


def test_sdk2_direct_client_uses_2026_protocol() -> None:
    """Exercise the SDK 2 in-memory transport without private server internals."""

    async def smoke() -> None:
        async with Client(mcp, mode=PROTOCOL_VERSION) as client:
            await _assert_server_contract(client)

    asyncio.run(smoke())


def test_sdk2_stdio_subprocess_uses_2026_protocol() -> None:
    """Exercise the packaged server over the same stdio boundary used by agents."""

    async def smoke() -> None:
        env = {
            **os.environ,
            "DRAWIO_AUTO_START_WEB": "false",
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUNBUFFERED": "1",
        }
        params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "drawio_mcp_server"],
            cwd=SERVER_ROOT,
            env=env,
        )
        async with Client(
            stdio_client(params),
            mode=PROTOCOL_VERSION,
            read_timeout_seconds=15,
        ) as client:
            await _assert_server_contract(client)

    asyncio.run(smoke())
