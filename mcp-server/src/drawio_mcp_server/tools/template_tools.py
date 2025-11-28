"""
Draw.io MCP Tools - 模板與匯出工具
"""

from pathlib import Path
from typing import Optional, Literal
from pydantic import Field

from ..diagram_generator import DiagramGenerator
from ..templates import DiagramTemplates


# 初始化
generator = DiagramGenerator()
templates = DiagramTemplates()


def list_templates_impl() -> str:
    """列出所有模板"""
    return templates.list_templates()


def create_from_template_impl(
    template_name: str,
    output_path: Optional[str] = None,
    customizations: Optional[str] = None
) -> str:
    """從模板創建圖表"""
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


def export_diagram_impl(
    file_path: str,
    format: str = "svg",
    output_path: Optional[str] = None
) -> str:
    """匯出圖表"""
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


def register_template_tools(mcp):
    """註冊模板工具到 MCP"""
    
    @mcp.tool()
    def list_templates() -> str:
        """
        列出所有可用的圖表模板和圖標集。
        包含 AWS、GCP、Azure 架構模板，以及常用流程圖模板。
        """
        return list_templates_impl()
    
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
        return create_from_template_impl(
            template_name=template_name,
            output_path=output_path,
            customizations=customizations
        )
    
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
        return export_diagram_impl(
            file_path=file_path,
            format=format,
            output_path=output_path
        )
