"""
Draw.io MCP Server
使用 FastMCP 建立的 MCP Server，讓 GitHub Copilot 可以創建和編輯 Draw.io 圖表
"""

from fastmcp import FastMCP
from pathlib import Path
from typing import Optional, Literal
from pydantic import Field

from .diagram_generator import DiagramGenerator
from .templates import DiagramTemplates

# 創建 FastMCP 實例
mcp = FastMCP("drawio-mcp-server")

# 初始化圖表生成器
generator = DiagramGenerator()
templates = DiagramTemplates()


@mcp.tool()
def create_diagram(
    description: str = Field(description="描述你想要的圖表，例如：'一個顯示用戶登入流程的流程圖'"),
    diagram_type: Literal["flowchart", "aws", "gcp", "azure", "mindmap", "sequence", "er", "network", "custom"] = Field(
        default="custom",
        description="圖表類型：flowchart(流程圖), aws/gcp/azure(雲架構), mindmap(心智圖), sequence(序列圖), er(ER圖), network(網路圖)"
    ),
    output_path: Optional[str] = Field(
        default=None,
        description="輸出檔案路徑（.drawio 或 .xml），如不指定則直接返回 XML 內容"
    )
) -> str:
    """
    根據文字描述創建新的 Draw.io 圖表。
    支援流程圖、雲端架構圖（AWS/GCP/Azure）、心智圖、序列圖等多種類型。
    """
    try:
        xml = generator.create_diagram(description, diagram_type)
        
        if output_path:
            path = Path(output_path)
            # 確保有正確的副檔名
            if path.suffix not in ['.drawio', '.xml']:
                path = path.with_suffix('.drawio')
            
            full_xml = generator.wrap_in_drawio_format(xml)
            path.write_text(full_xml, encoding='utf-8')
            return f"✅ 圖表已儲存至: {path}\n\n可以用 Draw.io 或 VS Code Draw.io 擴充功能開啟。"
        
        return f"✅ 圖表 XML 已生成:\n\n```xml\n{xml}\n```\n\n將此內容儲存為 .drawio 檔案即可使用。"
        
    except Exception as e:
        return f"❌ 創建圖表時發生錯誤: {str(e)}"


@mcp.tool()
def edit_diagram(
    file_path: str = Field(description="要編輯的 .drawio 檔案路徑"),
    changes: str = Field(description="描述要做的修改，例如：'添加一個資料庫節點' 或 '將 Server 改名為 API Gateway'")
) -> str:
    """
    編輯現有的 Draw.io 圖表。
    可以添加、刪除、修改元素，或重新排列佈局。
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"❌ 找不到檔案: {file_path}"
        
        current_xml = path.read_text(encoding='utf-8')
        updated_xml = generator.edit_diagram(current_xml, changes)
        path.write_text(updated_xml, encoding='utf-8')
        
        return f"✅ 圖表已更新: {file_path}\n\n修改內容: {changes}"
        
    except Exception as e:
        return f"❌ 編輯圖表時發生錯誤: {str(e)}"


@mcp.tool()
def read_diagram(
    file_path: str = Field(description="要讀取的 .drawio 檔案路徑")
) -> str:
    """
    讀取並描述 Draw.io 圖表的內容。
    返回圖表中的元素、連接和結構摘要。
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"❌ 找不到檔案: {file_path}"
        
        xml = path.read_text(encoding='utf-8')
        description = generator.describe_diagram(xml)
        
        return f"📊 圖表內容:\n\n{description}"
        
    except Exception as e:
        return f"❌ 讀取圖表時發生錯誤: {str(e)}"


@mcp.tool()
def list_templates() -> str:
    """
    列出所有可用的圖表模板和圖標集。
    包含 AWS、GCP、Azure 架構模板，以及常用流程圖模板。
    """
    return templates.list_templates()


@mcp.tool()
def create_from_template(
    template_name: Literal[
        "aws-3tier", "aws-serverless", "aws-microservices",
        "gcp-basic", "gcp-kubernetes",
        "azure-webapp", "azure-functions",
        "flowchart-basic", "flowchart-decision",
        "mindmap-basic",
        "sequence-basic",
        "er-basic"
    ] = Field(description="模板名稱"),
    output_path: Optional[str] = Field(
        default=None,
        description="輸出檔案路徑"
    ),
    customizations: Optional[str] = Field(
        default=None,
        description="可選的自訂修改描述"
    )
) -> str:
    """
    從預設模板創建圖表。
    可以選擇 AWS/GCP/Azure 架構模板或一般流程圖模板。
    """
    try:
        xml = templates.get_template(template_name)
        
        if customizations:
            xml = generator.apply_customizations(xml, customizations)
        
        if output_path:
            path = Path(output_path)
            if path.suffix not in ['.drawio', '.xml']:
                path = path.with_suffix('.drawio')
            
            full_xml = generator.wrap_in_drawio_format(xml)
            path.write_text(full_xml, encoding='utf-8')
            return f"✅ 模板 '{template_name}' 已儲存至: {path}"
        
        return f"✅ 模板 '{template_name}' 已生成:\n\n```xml\n{xml}\n```"
        
    except Exception as e:
        return f"❌ 創建模板時發生錯誤: {str(e)}"


@mcp.tool()
def export_diagram(
    file_path: str = Field(description="要匯出的 .drawio 檔案路徑"),
    format: Literal["svg", "png", "pdf"] = Field(
        default="svg",
        description="匯出格式: svg, png, pdf"
    ),
    output_path: Optional[str] = Field(
        default=None,
        description="匯出檔案路徑，不指定則使用原檔名"
    )
) -> str:
    """
    將 Draw.io 圖表匯出為 SVG、PNG 或 PDF 格式。
    """
    try:
        input_path = Path(file_path)
        if not input_path.exists():
            return f"❌ 找不到檔案: {file_path}"
        
        if output_path:
            out_path = Path(output_path)
        else:
            out_path = input_path.with_suffix(f".{format}")
        
        xml = input_path.read_text(encoding='utf-8')
        exported = generator.export_diagram(xml, format)
        
        if format == "svg":
            out_path.write_text(exported, encoding='utf-8')
        else:
            out_path.write_bytes(exported)
        
        return f"✅ 圖表已匯出至: {out_path}"
        
    except Exception as e:
        return f"❌ 匯出圖表時發生錯誤: {str(e)}"


def main():
    """啟動 MCP Server"""
    mcp.run()


if __name__ == "__main__":
    main()
