"""
圖表生成器 - 處理 Draw.io XML 的生成和編輯
"""

import re
import xml.etree.ElementTree as ET
from typing import Optional, Tuple
import base64
import zlib
from datetime import datetime


class DiagramGenerator:
    """Draw.io 圖表生成器"""
    
    def __init__(self):
        self.id_counter = 2  # 0 和 1 是保留的
    
    def _next_id(self) -> str:
        """生成下一個唯一 ID"""
        self.id_counter += 1
        return str(self.id_counter)
    
    def _reset_id_counter(self):
        """重置 ID 計數器"""
        self.id_counter = 2
    
    def create_diagram(self, description: str, diagram_type: str) -> str:
        """
        根據描述創建圖表 XML
        返回完整的 mxGraphModel 內容（可直接用於瀏覽器顯示）
        """
        self._reset_id_counter()
        
        # 基本的 Draw.io XML 結構
        elements = []
        
        if diagram_type == "flowchart":
            elements = self._create_flowchart_elements(description)
        elif diagram_type in ["aws", "gcp", "azure"]:
            elements = self._create_cloud_architecture_elements(description, diagram_type)
        elif diagram_type == "mindmap":
            elements = self._create_mindmap_elements(description)
        elif diagram_type == "sequence":
            elements = self._create_sequence_elements(description)
        elif diagram_type == "er":
            elements = self._create_er_elements(description)
        else:
            elements = self._create_custom_elements(description)
        
        root_xml = self._build_root_xml(elements)
        
        # 返回完整的 mxfile 格式（用於瀏覽器顯示）
        return self._wrap_for_browser(root_xml)
    
    def _wrap_for_browser(self, root_xml: str) -> str:
        """
        包裝成瀏覽器可直接載入的完整 mxfile 格式
        react-drawio 的 load() 方法需要完整的 mxfile XML
        """
        return f'''<mxfile host="drawio-mcp" modified="{self._get_timestamp()}" agent="Draw.io MCP Server" version="24.0.0" type="device">
  <diagram id="diagram-1" name="Page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      {root_xml}
    </mxGraphModel>
  </diagram>
</mxfile>'''
    
    def _get_timestamp(self) -> str:
        """獲取當前時間戳"""
        return datetime.now().isoformat()
    
    def _build_root_xml(self, elements: list) -> str:
        """構建 root XML"""
        xml_parts = [
            '<root>',
            '  <mxCell id="0"/>',
            '  <mxCell id="1" parent="0"/>',
        ]
        xml_parts.extend(elements)
        xml_parts.append('</root>')
        return '\n'.join(xml_parts)
    
    def _create_flowchart_elements(self, description: str) -> list:
        """創建流程圖元素"""
        # 基本流程圖示例
        return [
            f'  <mxCell id="{self._next_id()}" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">',
            '    <mxGeometry x="100" y="40" width="80" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="處理步驟" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">',
            '    <mxGeometry x="80" y="120" width="120" height="60" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="結束" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1">',
            '    <mxGeometry x="100" y="220" width="80" height="40" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_cloud_architecture_elements(self, description: str, provider: str) -> list:
        """創建雲端架構圖元素"""
        if provider == "aws":
            return self._create_aws_elements(description)
        elif provider == "gcp":
            return self._create_gcp_elements(description)
        elif provider == "azure":
            return self._create_azure_elements(description)
        return []
    
    def _create_aws_elements(self, description: str) -> list:
        """創建 AWS 架構圖元素"""
        return [
            # AWS Cloud 容器
            f'  <mxCell id="{self._next_id()}" value="AWS Cloud" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;" vertex="1" parent="1">',
            '    <mxGeometry x="40" y="40" width="520" height="360" as="geometry"/>',
            '  </mxCell>',
            # VPC
            f'  <mxCell id="{self._next_id()}" value="VPC" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;" vertex="1" parent="1">',
            '    <mxGeometry x="60" y="80" width="480" height="300" as="geometry"/>',
            '  </mxCell>',
            # EC2
            f'  <mxCell id="{self._next_id()}" value="EC2" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;" vertex="1" parent="1">',
            '    <mxGeometry x="200" y="160" width="78" height="78" as="geometry"/>',
            '  </mxCell>',
            # RDS
            f'  <mxCell id="{self._next_id()}" value="RDS" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#C925D1;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;" vertex="1" parent="1">',
            '    <mxGeometry x="380" y="160" width="78" height="78" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_gcp_elements(self, description: str) -> list:
        """創建 GCP 架構圖元素"""
        return [
            f'  <mxCell id="{self._next_id()}" value="Google Cloud Platform" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#4285F4;strokeColor=#1A73E8;fontColor=#ffffff;fontSize=14;" vertex="1" parent="1">',
            '    <mxGeometry x="40" y="40" width="520" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="Compute Engine" style="shape=mxgraph.gcp2.compute_engine;html=1;whiteSpace=wrap;fillColor=#4285F4;strokeColor=none;verticalAlign=top;verticalLabelPosition=bottom;align=center;" vertex="1" parent="1">',
            '    <mxGeometry x="200" y="120" width="78" height="78" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="Cloud SQL" style="shape=mxgraph.gcp2.cloud_sql;html=1;whiteSpace=wrap;fillColor=#4285F4;strokeColor=none;verticalAlign=top;verticalLabelPosition=bottom;align=center;" vertex="1" parent="1">',
            '    <mxGeometry x="380" y="120" width="78" height="78" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_azure_elements(self, description: str) -> list:
        """創建 Azure 架構圖元素"""
        return [
            f'  <mxCell id="{self._next_id()}" value="Azure" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0078D4;strokeColor=#0063B1;fontColor=#ffffff;fontSize=14;" vertex="1" parent="1">',
            '    <mxGeometry x="40" y="40" width="520" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="Virtual Machine" style="aspect=fixed;html=1;points=[];align=center;image;fontSize=12;image=img/lib/azure2/compute/Virtual_Machine.svg;" vertex="1" parent="1">',
            '    <mxGeometry x="200" y="120" width="68" height="62" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="SQL Database" style="aspect=fixed;html=1;points=[];align=center;image;fontSize=12;image=img/lib/azure2/databases/SQL_Database.svg;" vertex="1" parent="1">',
            '    <mxGeometry x="380" y="120" width="64" height="64" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_mindmap_elements(self, description: str) -> list:
        """創建心智圖元素"""
        return [
            f'  <mxCell id="{self._next_id()}" value="主題" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=16;fontStyle=1;" vertex="1" parent="1">',
            '    <mxGeometry x="240" y="160" width="120" height="80" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="分支 1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">',
            '    <mxGeometry x="80" y="60" width="100" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="分支 2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">',
            '    <mxGeometry x="420" y="60" width="100" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="分支 3" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1">',
            '    <mxGeometry x="80" y="300" width="100" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="分支 4" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;" vertex="1" parent="1">',
            '    <mxGeometry x="420" y="300" width="100" height="40" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_sequence_elements(self, description: str) -> list:
        """創建序列圖元素"""
        return [
            # 參與者
            f'  <mxCell id="{self._next_id()}" value="用戶" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;" vertex="1" parent="1">',
            '    <mxGeometry x="100" y="40" width="30" height="60" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="系統" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">',
            '    <mxGeometry x="260" y="40" width="80" height="40" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="資料庫" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;" vertex="1" parent="1">',
            '    <mxGeometry x="420" y="30" width="60" height="60" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_er_elements(self, description: str) -> list:
        """創建 ER 圖元素"""
        return [
            f'  <mxCell id="{self._next_id()}" value="User" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">',
            '    <mxGeometry x="80" y="80" width="140" height="104" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="id: int (PK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontStyle=4;" vertex="1" parent="{self.id_counter - 1}">',
            '    <mxGeometry y="26" width="140" height="26" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="name: varchar" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="{self.id_counter - 2}">',
            '    <mxGeometry y="52" width="140" height="26" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="email: varchar" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="{self.id_counter - 3}">',
            '    <mxGeometry y="78" width="140" height="26" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def _create_custom_elements(self, description: str) -> list:
        """創建自定義圖表元素"""
        return [
            f'  <mxCell id="{self._next_id()}" value="元素 1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">',
            '    <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="元素 2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">',
            '    <mxGeometry x="300" y="100" width="120" height="60" as="geometry"/>',
            '  </mxCell>',
            f'  <mxCell id="{self._next_id()}" value="" style="endArrow=classic;html=1;rounded=0;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="{self.id_counter - 2}" target="{self.id_counter - 1}">',
            '    <mxGeometry width="50" height="50" relative="1" as="geometry"/>',
            '  </mxCell>',
        ]
    
    def wrap_in_drawio_format(self, root_xml: str) -> str:
        """將 root XML 包裝成完整的 .drawio 檔案格式"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="{self._get_timestamp()}" agent="Draw.io MCP Server" version="24.0.0" type="device">
  <diagram id="diagram-1" name="Page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      {root_xml}
    </mxGraphModel>
  </diagram>
</mxfile>'''
    
    def edit_diagram(self, current_xml: str, changes: str) -> str:
        """
        編輯現有圖表
        這是一個簡化版本，實際應該解析 XML 並應用更改
        """
        # 這裡可以實現更複雜的編輯邏輯
        # 目前只是返回原始 XML（實際使用時由 LLM 處理）
        return current_xml
    
    def describe_diagram(self, xml: str) -> str:
        """描述圖表內容"""
        try:
            # 嘗試解析 XML
            root = ET.fromstring(xml)
            
            elements = []
            connections = []
            
            # 遍歷所有 mxCell 元素
            for cell in root.iter('mxCell'):
                value = cell.get('value', '')
                style = cell.get('style', '')
                is_edge = cell.get('edge') == '1'
                
                if is_edge:
                    source = cell.get('source', 'unknown')
                    target = cell.get('target', 'unknown')
                    connections.append(f"- 連接: {source} → {target}")
                elif value:
                    elements.append(f"- 元素: {value}")
            
            result = "📊 圖表分析:\n\n"
            
            if elements:
                result += "**元素:**\n" + "\n".join(elements) + "\n\n"
            
            if connections:
                result += "**連接:**\n" + "\n".join(connections)
            
            if not elements and not connections:
                result += "這是一個空白圖表或無法解析的格式。"
            
            return result
            
        except ET.ParseError:
            return "無法解析圖表 XML 格式。"
    
    def apply_customizations(self, xml: str, customizations: str) -> str:
        """應用自定義修改到模板"""
        # 簡化版本，實際使用時由 LLM 處理
        return xml
    
    def export_diagram(self, xml: str, format: str) -> str | bytes:
        """
        匯出圖表
        注意：完整的 PNG/PDF 匯出需要 headless browser，
        這裡只實現 SVG 匯出
        """
        if format == "svg":
            return self._export_to_svg(xml)
        else:
            raise NotImplementedError(f"匯出為 {format} 格式需要額外的依賴（如 puppeteer）")
    
    def _export_to_svg(self, xml: str) -> str:
        """簡單的 SVG 匯出"""
        # 這是一個簡化版本
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="800" height="600" viewBox="0 0 800 600">
  <text x="400" y="300" text-anchor="middle" font-size="20">
    Draw.io Diagram (請使用 Draw.io 開啟 .drawio 檔案以獲得完整渲染)
  </text>
</svg>'''
