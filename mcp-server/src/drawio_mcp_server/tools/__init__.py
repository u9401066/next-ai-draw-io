"""
Draw.io MCP Tools
所有 MCP 工具的統一入口
"""

from .tab_tools import register_tab_tools
from .diagram_tools import register_diagram_tools
from .template_tools import register_template_tools
from .web_tools import register_web_tools


def register_all_tools(mcp):
    """註冊所有工具到 MCP"""
    register_diagram_tools(mcp)
    register_template_tools(mcp)
    register_tab_tools(mcp)
    register_web_tools(mcp)


__all__ = [
    "register_all_tools",
    "register_tab_tools",
    "register_diagram_tools", 
    "register_template_tools",
    "register_web_tools",
]
