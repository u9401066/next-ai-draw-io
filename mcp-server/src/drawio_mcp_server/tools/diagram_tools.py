"""
Draw.io MCP Tools - 圖表創建與編輯工具
"""

from pathlib import Path
from typing import Optional, Literal
from pydantic import Field

from ..config import config
from ..web_client import web_client
from ..diagram_generator import DiagramGenerator, encode_non_ascii_to_entities
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
    """創建圖表的實作（使用模板）"""
    try:
        # 生成圖表 XML
        xml = generator.create_diagram(description, diagram_type)
        return await _send_xml_to_browser(
            xml=xml,
            tab_name=tab_name,
            tab_id=tab_id,
            send_to_browser=send_to_browser,
            output_path=output_path
        )
    except Exception as e:
        return f"❌ 創建圖表時發生錯誤: {str(e)}"


async def display_xml_impl(
    xml: str,
    tab_name: Optional[str] = None,
    tab_id: Optional[str] = None,
    send_to_browser: bool = True,
    output_path: Optional[str] = None
) -> str:
    """直接顯示 XML 圖表的實作"""
    try:
        # 如果只提供了 root 內容，包裝成完整格式
        if not xml.strip().startswith('<mxfile'):
            if not xml.strip().startswith('<root>'):
                # 假設是 root 內容，需要包裝
                xml = f"<root>\n  <mxCell id=\"0\"/>\n  <mxCell id=\"1\" parent=\"0\"/>\n{xml}\n</root>"
            xml = generator._wrap_for_browser(xml)
        else:
            # 已經是完整的 mxfile 格式，但仍需要編碼非 ASCII 字符
            xml = encode_non_ascii_to_entities(xml)
        
        return await _send_xml_to_browser(
            xml=xml,
            tab_name=tab_name,
            tab_id=tab_id,
            send_to_browser=send_to_browser,
            output_path=output_path
        )
    except Exception as e:
        return f"❌ 顯示圖表時發生錯誤: {str(e)}"


async def _send_xml_to_browser(
    xml: str,
    tab_name: Optional[str] = None,
    tab_id: Optional[str] = None,
    send_to_browser: bool = True,
    output_path: Optional[str] = None
) -> str:
    """共用的發送 XML 到瀏覽器邏輯"""
    result_messages = []
    
    # 驗證 XML
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
        
        full_xml = generator.wrap_in_drawio_format(xml) if not xml.strip().startswith('<?xml') else xml
        path.write_text(full_xml, encoding='utf-8')
        result_messages.append(f"💾 圖表已儲存至: {path}")
    
    if not result_messages:
        result_messages.append(f"✅ 圖表 XML 已生成")
    
    # 提示 Agent 開啟瀏覽器（僅首次需要）
    if send_to_browser and "error" not in str(result_messages):
        result_messages.append(f"\n💡 圖表已即時更新在 {config.nextjs_url}")
        result_messages.append(f"⚠️ 注意：如果瀏覽器已開啟，不需要重複呼叫 open_simple_browser（會刷新頁面）")
    
    return "\n".join(result_messages)


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
        xml: Optional[str] = Field(
            default=None,
            description="""直接提供 Draw.io XML 格式的圖表內容。如果提供此參數，將直接使用而不使用模板。

XML 格式說明：
只需提供 <root> 標籤內的內容，例如：
```xml
<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
    <mxGeometry x="100" y="40" width="80" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="處理" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="80" y="120" width="120" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="" style="endArrow=classic;html=1;" edge="1" parent="1" source="2" target="3">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
</root>
```

常用樣式：
- 矩形: style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
- 橢圓: style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;"
- 菱形: style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;"
- 箭頭: style="endArrow=classic;html=1;" edge="1"
- 圓形: style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;"

顏色選項 (fillColor;strokeColor):
- 藍色: #dae8fc;#6c8ebf
- 綠色: #d5e8d4;#82b366  
- 黃色: #fff2cc;#d6b656
- 橘色: #ffe6cc;#d79b00
- 紫色: #e1d5e7;#9673a6
- 紅色: #f8cecc;#b85450

佈局提示：
- 使用 x, y 座標定位元素
- 保持 x: 0-800, y: 0-600 範圍內
- 使用 width, height 設定大小
"""
        ),
        diagram_type: Literal["flowchart", "aws", "gcp", "azure", "mindmap", "sequence", "er", "network", "custom"] = Field(
            default="custom",
            description="圖表類型（僅當未提供 xml 時使用）：flowchart(流程圖), aws/gcp/azure(雲架構), mindmap(心智圖), sequence(序列圖), er(ER圖)"
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
        創建 Draw.io 圖表並顯示在瀏覽器中。
        
        有兩種使用方式：
        1. 提供 xml 參數：直接使用你生成的 Draw.io XML（推薦用於複雜圖表）
        2. 只提供 description：使用內建模板快速生成基本圖表
        
        建議：對於複雜的圖表（如系統架構、研究路線圖等），請自行生成 XML 並透過 xml 參數傳入。
        """
        # 如果提供了 XML，直接使用
        if xml:
            return await display_xml_impl(
                xml=xml,
                tab_name=tab_name,
                tab_id=tab_id,
                send_to_browser=send_to_browser,
                output_path=output_path
            )
        
        # 否則使用模板生成
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
