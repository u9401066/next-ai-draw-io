"""
Draw.io XML 驗證器
確保生成的 XML 符合 Draw.io 格式要求
"""

import xml.etree.ElementTree as ET
from typing import Tuple, List, Optional
from dataclasses import dataclass
from enum import Enum


class ValidationLevel(Enum):
    """驗證級別"""
    ERROR = "error"      # 致命錯誤，無法顯示
    WARNING = "warning"  # 警告，可能顯示異常
    INFO = "info"        # 資訊，建議修正


@dataclass
class ValidationResult:
    """驗證結果"""
    valid: bool
    level: ValidationLevel
    message: str
    location: Optional[str] = None


class DiagramValidator:
    """Draw.io 圖表驗證器"""
    
    def __init__(self):
        self.results: List[ValidationResult] = []
    
    def validate(self, xml: str, is_root_only: bool = False) -> Tuple[bool, List[ValidationResult]]:
        """
        驗證 XML 格式
        
        Args:
            xml: XML 字符串
            is_root_only: 是否只是 <root> 內容（不是完整的 mxfile）
            
        Returns:
            (是否有效, 驗證結果列表)
        """
        self.results = []
        
        # 1. 基本 XML 語法檢查
        if not self._check_xml_syntax(xml):
            return False, self.results
        
        # 2. 結構檢查
        if is_root_only:
            self._check_root_structure(xml)
        else:
            self._check_mxfile_structure(xml)
        
        # 3. 元素檢查
        self._check_mxcell_elements(xml)
        
        # 4. ID 唯一性檢查
        self._check_id_uniqueness(xml)
        
        # 5. 樣式檢查
        self._check_styles(xml)
        
        # 判斷是否有效（沒有 ERROR 級別的問題）
        has_errors = any(r.level == ValidationLevel.ERROR for r in self.results)
        
        return not has_errors, self.results
    
    def _check_xml_syntax(self, xml: str) -> bool:
        """檢查 XML 語法"""
        try:
            ET.fromstring(xml)
            return True
        except ET.ParseError as e:
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message=f"XML 語法錯誤: {str(e)}",
                location="xml_syntax"
            ))
            return False
    
    def _check_root_structure(self, xml: str) -> None:
        """檢查 root 結構"""
        root = ET.fromstring(xml)
        
        if root.tag != 'root':
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message=f"根元素應該是 'root'，但得到 '{root.tag}'",
                location="root_element"
            ))
            return
        
        # 檢查必要的 mxCell id="0" 和 id="1"
        cells = root.findall('mxCell')
        ids = [cell.get('id') for cell in cells]
        
        if '0' not in ids:
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message="缺少 mxCell id='0'（這是 Draw.io 的必要元素）",
                location="mxCell_0"
            ))
        
        if '1' not in ids:
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message="缺少 mxCell id='1'（這是 Draw.io 的 parent 元素）",
                location="mxCell_1"
            ))
    
    def _check_mxfile_structure(self, xml: str) -> None:
        """檢查完整的 mxfile 結構"""
        root = ET.fromstring(xml)
        
        if root.tag != 'mxfile':
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message=f"根元素應該是 'mxfile'，但得到 '{root.tag}'",
                location="mxfile_element"
            ))
            return
        
        # 檢查 diagram 元素
        diagram = root.find('diagram')
        if diagram is None:
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message="缺少 <diagram> 元素",
                location="diagram_element"
            ))
            return
        
        # 檢查 mxGraphModel
        graph_model = diagram.find('mxGraphModel')
        if graph_model is None:
            self.results.append(ValidationResult(
                valid=False,
                level=ValidationLevel.ERROR,
                message="缺少 <mxGraphModel> 元素",
                location="mxGraphModel_element"
            ))
    
    def _check_mxcell_elements(self, xml: str) -> None:
        """檢查 mxCell 元素"""
        root = ET.fromstring(xml)
        
        for cell in root.iter('mxCell'):
            cell_id = cell.get('id', 'unknown')
            
            # 跳過基礎元素 0 和 1
            if cell_id in ['0', '1']:
                continue
            
            # 檢查 parent 屬性
            parent = cell.get('parent')
            if parent is None and cell.get('vertex') == '1':
                self.results.append(ValidationResult(
                    valid=True,
                    level=ValidationLevel.WARNING,
                    message=f"mxCell id='{cell_id}' 缺少 parent 屬性",
                    location=f"mxCell_{cell_id}"
                ))
            
            # 檢查 geometry
            geometry = cell.find('mxGeometry')
            if cell.get('vertex') == '1' and geometry is None:
                self.results.append(ValidationResult(
                    valid=True,
                    level=ValidationLevel.WARNING,
                    message=f"頂點 mxCell id='{cell_id}' 缺少 mxGeometry",
                    location=f"mxCell_{cell_id}"
                ))
    
    def _check_id_uniqueness(self, xml: str) -> None:
        """檢查 ID 唯一性"""
        root = ET.fromstring(xml)
        
        ids = []
        for cell in root.iter('mxCell'):
            cell_id = cell.get('id')
            if cell_id:
                if cell_id in ids:
                    self.results.append(ValidationResult(
                        valid=False,
                        level=ValidationLevel.ERROR,
                        message=f"重複的 ID: '{cell_id}'",
                        location=f"mxCell_{cell_id}"
                    ))
                ids.append(cell_id)
    
    def _check_styles(self, xml: str) -> None:
        """檢查樣式"""
        root = ET.fromstring(xml)
        
        for cell in root.iter('mxCell'):
            cell_id = cell.get('id', 'unknown')
            style = cell.get('style', '')
            
            # 跳過基礎元素
            if cell_id in ['0', '1']:
                continue
            
            # 檢查常見的樣式問題
            if style and ';' not in style and '=' in style:
                # 可能缺少分號
                pass  # 這通常是可接受的
            
            # 檢查是否有未閉合的引號
            if style.count('"') % 2 != 0:
                self.results.append(ValidationResult(
                    valid=True,
                    level=ValidationLevel.WARNING,
                    message=f"mxCell id='{cell_id}' 的 style 可能有未閉合的引號",
                    location=f"mxCell_{cell_id}_style"
                ))
    
    def format_results(self) -> str:
        """格式化驗證結果"""
        if not self.results:
            return "✅ 驗證通過，沒有發現問題"
        
        lines = ["📋 驗證結果:\n"]
        
        errors = [r for r in self.results if r.level == ValidationLevel.ERROR]
        warnings = [r for r in self.results if r.level == ValidationLevel.WARNING]
        infos = [r for r in self.results if r.level == ValidationLevel.INFO]
        
        if errors:
            lines.append("❌ 錯誤:")
            for r in errors:
                lines.append(f"  - {r.message}")
        
        if warnings:
            lines.append("\n⚠️ 警告:")
            for r in warnings:
                lines.append(f"  - {r.message}")
        
        if infos:
            lines.append("\nℹ️ 資訊:")
            for r in infos:
                lines.append(f"  - {r.message}")
        
        return "\n".join(lines)


def validate_and_fix(xml: str) -> Tuple[str, bool, str]:
    """
    驗證並嘗試修復 XML
    
    Args:
        xml: 原始 XML
        
    Returns:
        (修復後的 XML, 是否需要修復, 修復說明)
    """
    validator = DiagramValidator()
    
    # 先嘗試驗證
    is_valid, results = validator.validate(xml)
    
    if is_valid:
        return xml, False, "XML 格式正確"
    
    # 嘗試修復常見問題
    fixed_xml = xml
    fixes = []
    
    # 檢查是否缺少 root 元素
    if not xml.strip().startswith('<root>'):
        # 可能只是內容，需要包裝
        if '<mxCell' in xml:
            fixed_xml = f'<root>\n  <mxCell id="0"/>\n  <mxCell id="1" parent="0"/>\n{xml}\n</root>'
            fixes.append("添加了 root 元素和基礎 mxCell")
    
    # 再次驗證
    is_valid, results = validator.validate(fixed_xml)
    
    fix_description = "\n".join(fixes) if fixes else "無法自動修復"
    
    return fixed_xml, len(fixes) > 0, fix_description


# 便捷函數
def quick_validate(xml: str) -> bool:
    """快速驗證 XML 是否有效"""
    validator = DiagramValidator()
    is_valid, _ = validator.validate(xml)
    return is_valid
