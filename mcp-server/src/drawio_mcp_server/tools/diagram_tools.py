"""
Draw.io MCP Tools - 圖表創建與編輯工具
"""

from pathlib import Path
from typing import Optional, Literal
from pydantic import Field

from ..config import config
from ..web_client import web_client
from ..diagram_generator import DiagramGenerator
from ..validator import DiagramValidator, validate_and_fix


# 初始化
generator = DiagramGenerator()
validator = DiagramValidator()


async def create_diagram_impl(
    description: str,
    diagram_type: str,
    tab_name: Optional[str] = None,
    tab_id: Optional[str] = None,
    send_to_browser: bool = True,
    output_path: Optional[str] = None
) -> str:
    """創建圖表的實作"""
    try:
        # 生成圖表 XML
        xml = generator.create_diagram(description, diagram_type)
        result_messages = []
        
        # 驗證生成的 XML
        is_valid, validation_results = validator.validate(xml, is_root_only=False)
        if not is_valid:
            # 嘗試修復
            fixed_xml, was_fixed, fix_desc = validate_and_fix(xml)
            if was_fixed:
                xml = fixed_xml
                result_messages.append(f"🔧 已自動修復 XML: {fix_desc}")
            else:
                error_msgs = [r.message for r in validation_results if r.level.value == "error"]
                result_messages.append(f"⚠️ XML 驗證警告: {'; '.join(error_msgs[:2])}")
        
        # 發送到瀏覽器
        if send_to_browser:
            response = await web_client.send(
                action="display", 
                xml=xml, 
                tab_id=tab_id, 
                tab_name=tab_name
            )
            if "error" in response:
                result_messages.append(f"⚠️ {response['error']}")
            else:
                created_tab_id = response.get("tabId", "unknown")
                created_tab_name = response.get("tabName", "Diagram")
                result_messages.append(f"✅ 圖表已顯示在分頁 [{created_tab_name}] (ID: {created_tab_id})")
                result_messages.append(f"🌐 瀏覽器: {config.nextjs_url}")
        
        # 儲存到檔案
        if output_path:
            path = Path(output_path)
            if path.suffix not in ['.drawio', '.xml']:
                path = path.with_suffix('.drawio')
            
            path.parent.mkdir(parents=True, exist_ok=True)
            
            full_xml = generator.wrap_in_drawio_format(xml)
            path.write_text(full_xml, encoding='utf-8')
            result_messages.append(f"💾 圖表已儲存至: {path}")
        
        if not result_messages:
            result_messages.append(f"✅ 圖表 XML 已生成:\n\n```xml\n{xml}\n```")
        
        # 提示 Agent 開啟瀏覽器
        if send_to_browser and "error" not in str(result_messages):
            result_messages.append(f"\n⚡ ACTION REQUIRED: Use `open_simple_browser` to open {config.nextjs_url}")
        
        return "\n".join(result_messages)
        
    except Exception as e:
        return f"❌ 創建圖表時發生錯誤: {str(e)}"


async def edit_diagram_impl(
    changes: str,
    tab_id: Optional[str] = None,
    file_path: Optional[str] = None
) -> str:
    """編輯圖表的實作"""
    try:
        edits = [{"search": "舊值", "replace": "新值"}]  # 示例
        
        if file_path:
            path = Path(file_path)
            if not path.exists():
                return f"❌ 找不到檔案: {file_path}"
            
            current_xml = path.read_text(encoding='utf-8')
            updated_xml = generator.edit_diagram(current_xml, changes)
            path.write_text(updated_xml, encoding='utf-8')
            return f"✅ 圖表已更新: {file_path}\n\n修改內容: {changes}"
        else:
            response = await web_client.send(action="edit", tab_id=tab_id, edits=edits)
            if "error" in response:
                return f"⚠️ {response['error']}"
            edited_tab_id = response.get("tabId", "current")
            return f"✅ 分頁 {edited_tab_id} 的圖表已更新！\n\n修改內容: {changes}"
        
    except Exception as e:
        return f"❌ 編輯圖表時發生錯誤: {str(e)}"


def read_diagram_impl(file_path: str) -> str:
    """讀取圖表的實作"""
    try:
        path = Path(file_path)
        if not path.exists():
            return f"❌ 找不到檔案: {file_path}"
        
        xml = path.read_text(encoding='utf-8')
        description = generator.describe_diagram(xml)
        
        return f"📊 圖表內容:\n\n{description}"
        
    except Exception as e:
        return f"❌ 讀取圖表時發生錯誤: {str(e)}"


def register_diagram_tools(mcp):
    """註冊圖表工具到 MCP"""
    
    @mcp.tool()
    async def create_diagram(
        description: str = Field(description="描述你想要的圖表，例如：'一個顯示用戶登入流程的流程圖'"),
        diagram_type: Literal["flowchart", "aws", "gcp", "azure", "mindmap", "sequence", "er", "network", "custom"] = Field(
            default="custom",
            description="圖表類型：flowchart(流程圖), aws/gcp/azure(雲架構), mindmap(心智圖), sequence(序列圖), er(ER圖), network(網路圖)"
        ),
        tab_name: Optional[str] = Field(
            default=None,
            description="分頁名稱，例如：'CONSORT Flowchart'。如果不指定，會自動命名為 'Diagram N'"
        ),
        tab_id: Optional[str] = Field(
            default=None,
            description="指定要更新的分頁 ID。如果不指定，會創建新分頁"
        ),
        send_to_browser: bool = Field(
            default=True,
            description="是否即時發送到瀏覽器中的 Draw.io 編輯器"
        ),
        output_path: Optional[str] = Field(
            default=None,
            description="輸出檔案路徑（.drawio 或 .xml），如不指定則不儲存檔案"
        )
    ) -> str:
        """
        根據文字描述創建新的 Draw.io 圖表。
        支援流程圖、雲端架構圖（AWS/GCP/Azure）、心智圖、序列圖等多種類型。
        圖表會即時顯示在瀏覽器的 Draw.io 編輯器中的指定分頁。
        """
        return await create_diagram_impl(
            description=description,
            diagram_type=diagram_type,
            tab_name=tab_name,
            tab_id=tab_id,
            send_to_browser=send_to_browser,
            output_path=output_path
        )
    
    @mcp.tool()
    async def edit_diagram(
        changes: str = Field(description="描述要做的修改，例如：'添加一個資料庫節點' 或 '將 Server 改名為 API Gateway'"),
        tab_id: Optional[str] = Field(
            default=None,
            description="要編輯的分頁 ID。如果不指定，會編輯當前活躍的分頁"
        ),
        file_path: Optional[str] = Field(
            default=None,
            description="要編輯的 .drawio 檔案路徑（如果要編輯瀏覽器中的圖表則不需要）"
        )
    ) -> str:
        """
        編輯現有的 Draw.io 圖表。
        可以添加、刪除、修改元素，或重新排列佈局。
        如果不指定檔案，會編輯瀏覽器中指定分頁或當前活躍分頁的圖表。
        """
        return await edit_diagram_impl(
            changes=changes,
            tab_id=tab_id,
            file_path=file_path
        )
    
    @mcp.tool()
    def read_diagram(
        file_path: str = Field(description="要讀取的 .drawio 檔案路徑")
    ) -> str:
        """
        讀取並描述 Draw.io 圖表的內容。
        返回圖表中的元素、連接和結構摘要。
        """
        return read_diagram_impl(file_path)
