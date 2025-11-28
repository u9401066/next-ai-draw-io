"""
Draw.io MCP Tools - 分頁管理工具
"""

import base64
import os
from pathlib import Path
from typing import Optional
from pydantic import Field

from ..config import config
from ..web_client import web_client


async def list_tabs_impl() -> str:
    """列出所有開啟的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。請先使用 start_drawio_web 啟動。"
    
    data = await web_client.get_tabs()
    
    if "error" in data:
        return f"⚠️ 無法取得分頁列表: {data['error']}"
    
    tabs = data.get("tabs", [])
    
    if not tabs:
        return "📋 目前沒有開啟的圖表分頁"
    
    result = ["📋 開啟的圖表分頁:\n"]
    for tab in tabs:
        active = "👉 " if tab.get("active") else "   "
        result.append(f"{active}{tab['id']}: {tab.get('name', '未命名')}")
    
    return "\n".join(result)


async def switch_tab_impl(tab_id: str) -> str:
    """切換到指定的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。請先使用 start_drawio_web 啟動。"
    
    result = await web_client.tab_action("switch", tab_id)
    
    if "error" in result:
        return f"⚠️ 切換分頁失敗: {result['error']}"
    
    return f"✅ 已切換到分頁: {tab_id}"


async def close_tab_impl(tab_id: str) -> str:
    """關閉指定的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。"
    
    result = await web_client.tab_action("close", tab_id)
    
    if "error" in result:
        return f"⚠️ 關閉分頁失敗: {result['error']}"
    
    return f"✅ 已關閉分頁: {tab_id}"


async def get_diagram_content_impl(tab_id: Optional[str] = None) -> dict:
    """
    取得圖表內容（供其他 MCP 使用）
    
    Args:
        tab_id: 分頁 ID，不指定則取得當前活躍分頁
        
    Returns:
        包含圖表資訊的 dict
    """
    if not web_client.is_running():
        return {"error": "Draw.io Web 未運行"}
    
    result = await web_client.get_diagram_content(tab_id)
    return result


async def save_tab_impl(
    file_path: Optional[str] = None,
    tab_id: Optional[str] = None
) -> str:
    """
    將分頁內容存檔到 .drawio 檔案
    
    Args:
        file_path: 要存檔的路徑（.drawio 或 .xml），不指定則回傳提示
        tab_id: 分頁 ID，不指定則存當前活躍分頁
        
    Returns:
        存檔結果訊息，或詢問用戶的提示
    """
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行"
    
    # 取得圖表內容
    result = await web_client.get_diagram_content(tab_id)
    
    if "error" in result:
        return f"❌ 取得圖表失敗: {result['error']}"
    
    xml = result.get("xml", "")
    tab_name = result.get("tabName", "未命名")
    
    if not xml:
        return "⚠️ 圖表內容為空，無法存檔"
    
    # 如果沒有指定路徑，回傳提示讓 Agent 詢問用戶
    if not file_path:
        return f"""🤔 需要確認存檔位置

**目前圖表:** {tab_name}
**內容大小:** {len(xml)} 字元

請詢問用戶要存到哪裡，例如：
1. **專案圖表**: 存到專案的 `diagrams/` 或 `figures/` 目錄
2. **隨手畫圖**: 存到 `~/Documents/` 或下載目錄
3. **指定路徑**: 用戶指定完整路徑

💡 建議提問方式：
「請問這個圖表要存到哪裡？
- 如果是專案相關，可以存到專案目錄（例如 `./diagrams/研究路線圖.drawio`）
- 如果是隨手畫的，可以存到文件目錄」"""
    
    # 確保副檔名正確
    path = Path(file_path)
    if path.suffix.lower() not in ['.drawio', '.xml']:
        path = path.with_suffix('.drawio')
    
    # 建立目錄（如果不存在）
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # 寫入檔案
    try:
        path.write_text(xml, encoding='utf-8')
        return f"""✅ 圖表已存檔

**分頁:** {tab_name}
**檔案:** {path}
**大小:** {len(xml)} 字元"""
    except Exception as e:
        return f"❌ 存檔失敗: {e}"


def register_tab_tools(mcp):
    """註冊分頁管理工具到 MCP"""
    
    @mcp.tool()
    async def list_tabs() -> str:
        """
        列出所有開啟的圖表分頁。
        每個分頁包含一個獨立的圖表。
        """
        return await list_tabs_impl()
    
    @mcp.tool()
    async def switch_tab(
        tab_id: str = Field(description="要切換到的分頁 ID")
    ) -> str:
        """
        切換到指定的圖表分頁。
        """
        return await switch_tab_impl(tab_id)
    
    @mcp.tool()
    async def close_tab(
        tab_id: str = Field(description="要關閉的分頁 ID")
    ) -> str:
        """
        關閉指定的圖表分頁。
        """
        return await close_tab_impl(tab_id)
    
    @mcp.tool()
    async def get_diagram_content(
        tab_id: Optional[str] = Field(
            default=None,
            description="分頁 ID，不指定則取得當前活躍分頁"
        ),
        format: str = Field(
            default="xml",
            description="回傳格式: xml (Draw.io XML) 或 base64 (編碼後的 XML)"
        )
    ) -> str:
        """
        取得圖表內容。
        
        用於將圖表存檔到專案或匯出。
        回傳 Draw.io XML 格式的圖表內容。
        
        使用情境：
        - Agent 需要存檔時呼叫此工具取得內容
        - 然後呼叫 mdpaper MCP 的 save_diagram 存到專案
        """
        result = await get_diagram_content_impl(tab_id)
        
        if "error" in result:
            return f"❌ 取得圖表失敗: {result['error']}"
        
        xml = result.get("xml", "")
        tab_name = result.get("tabName", "未命名")
        current_tab_id = result.get("tabId", "")
        
        if not xml:
            return "⚠️ 圖表內容為空"
        
        if format == "base64":
            xml_b64 = base64.b64encode(xml.encode('utf-8')).decode('ascii')
            return f"""📄 圖表內容 (base64)

**分頁:** {tab_name} ({current_tab_id})
**格式:** base64 encoded XML
**長度:** {len(xml)} 字元

```
{xml_b64}
```

💡 使用 mdpaper MCP 的 `save_diagram` 存檔到專案"""
        
        return f"""📄 圖表內容

**分頁:** {tab_name} ({current_tab_id})
**格式:** Draw.io XML
**長度:** {len(xml)} 字元

```xml
{xml[:2000]}{'...' if len(xml) > 2000 else ''}
```

💡 使用 `save_tab` 直接存檔，或 mdpaper MCP 的 `save_diagram` 存到專案"""

    @mcp.tool()
    async def save_tab(
        file_path: Optional[str] = Field(
            default=None,
            description="存檔路徑，例如 '/path/to/diagram.drawio'。如果不指定，將回傳提示讓你詢問用戶要存到哪裡"
        ),
        tab_id: Optional[str] = Field(
            default=None,
            description="要存檔的分頁 ID。不指定則存當前活躍分頁"
        )
    ) -> str:
        """
        將圖表分頁存檔到 .drawio 檔案。
        
        這是最簡單的存檔方式，直接將瀏覽器中的圖表存到本地檔案。
        
        使用情境：
        - 用戶說「存檔」或「save」→ 不指定 file_path，工具會提示你詢問用戶
        - 用戶說「把這個圖表存到 xxx.drawio」→ 指定 file_path
        - 在建立新圖表前先存檔舊的
        
        智能存檔流程：
        1. 如果用戶沒說要存哪裡 → 呼叫 save_tab() 不帶 file_path
        2. 工具回傳提示 → 你詢問用戶要存到哪裡
        3. 用戶回答後 → 呼叫 save_tab(file_path="用戶指定的路徑")
        
        範例：
        - save_tab()  # 詢問用戶要存哪裡
        - save_tab(file_path="flowchart.drawio")
        - save_tab(file_path="/home/user/diagrams/arch.drawio", tab_id="tab-1")
        """
        return await save_tab_impl(file_path, tab_id)
