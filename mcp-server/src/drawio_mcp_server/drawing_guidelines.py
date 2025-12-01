"""
Draw.io 繪圖指南與規範
Drawing Guidelines for Draw.io Diagrams

提供標準化的繪圖建議，包括：
- 連接線樣式（推薦使用轉角線）
- 顏色規範
- 形狀樣式
- 佈局建議
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class EdgeStyle(Enum):
    """連接線樣式"""
    ORTHOGONAL = "orthogonal"       # 正交轉角線（推薦）
    STRAIGHT = "straight"           # 直線
    CURVED = "curved"               # 曲線
    ENTITY_RELATION = "entityRelation"  # ER圖專用


class ArrowStyle(Enum):
    """箭頭樣式"""
    CLASSIC = "classic"             # 標準箭頭
    BLOCK = "block"                 # 方塊箭頭
    OPEN = "open"                   # 開放箭頭
    OVAL = "oval"                   # 圓形
    DIAMOND = "diamond"             # 菱形
    NONE = "none"                   # 無箭頭


@dataclass
class ColorPalette:
    """標準顏色調色板"""
    # 主要色系 (fillColor;strokeColor)
    BLUE = ("#dae8fc", "#6c8ebf")       # 藍色 - 處理步驟
    GREEN = ("#d5e8d4", "#82b366")      # 綠色 - 開始/成功
    YELLOW = ("#fff2cc", "#d6b656")     # 黃色 - 決策/注意
    ORANGE = ("#ffe6cc", "#d79b00")     # 橘色 - 警告/輸出
    PURPLE = ("#e1d5e7", "#9673a6")     # 紫色 - 外部系統/特殊
    RED = ("#f8cecc", "#b85450")        # 紅色 - 結束/錯誤
    GRAY = ("#f5f5f5", "#666666")       # 灰色 - 容器/背景
    WHITE = ("#ffffff", "#000000")      # 白色 - 一般


@dataclass
class DrawingGuidelines:
    """繪圖指南配置"""
    
    # === 連接線規範 ===
    default_edge_style: EdgeStyle = EdgeStyle.ORTHOGONAL
    default_arrow_start: ArrowStyle = ArrowStyle.NONE
    default_arrow_end: ArrowStyle = ArrowStyle.CLASSIC
    edge_stroke_width: int = 2
    edge_color: str = "#666666"
    
    # === 形狀規範 ===
    default_shape_rounded: bool = True
    shape_stroke_width: int = 2
    min_shape_width: int = 80
    min_shape_height: int = 40
    
    # === 佈局規範 ===
    grid_size: int = 20
    horizontal_spacing: int = 60
    vertical_spacing: int = 40
    canvas_padding: int = 40
    
    # === 字體規範 ===
    default_font_size: int = 12
    title_font_size: int = 16
    label_font_size: int = 11
    
    def to_dict(self) -> Dict:
        return {
            "edge": {
                "style": self.default_edge_style.value,
                "arrowStart": self.default_arrow_start.value,
                "arrowEnd": self.default_arrow_end.value,
                "strokeWidth": self.edge_stroke_width,
                "color": self.edge_color,
            },
            "shape": {
                "rounded": self.default_shape_rounded,
                "strokeWidth": self.shape_stroke_width,
                "minWidth": self.min_shape_width,
                "minHeight": self.min_shape_height,
            },
            "layout": {
                "gridSize": self.grid_size,
                "horizontalSpacing": self.horizontal_spacing,
                "verticalSpacing": self.vertical_spacing,
                "canvasPadding": self.canvas_padding,
            },
            "font": {
                "default": self.default_font_size,
                "title": self.title_font_size,
                "label": self.label_font_size,
            }
        }


# === 預設樣式定義 ===

# 連接線樣式字串
EDGE_STYLES = {
    EdgeStyle.ORTHOGONAL: "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;",
    EdgeStyle.STRAIGHT: "edgeStyle=none;",
    EdgeStyle.CURVED: "edgeStyle=orthogonalEdgeStyle;curved=1;",
    EdgeStyle.ENTITY_RELATION: "edgeStyle=entityRelationEdgeStyle;",
}

# 形狀樣式範本
SHAPE_STYLES = {
    "rectangle": "rounded=1;whiteSpace=wrap;html=1;",
    "ellipse": "ellipse;whiteSpace=wrap;html=1;",
    "rhombus": "rhombus;whiteSpace=wrap;html=1;",
    "parallelogram": "shape=parallelogram;whiteSpace=wrap;html=1;",
    "cylinder": "shape=cylinder3;whiteSpace=wrap;html=1;",
    "hexagon": "shape=hexagon;whiteSpace=wrap;html=1;",
    "document": "shape=document;whiteSpace=wrap;html=1;",
    "cloud": "shape=cloud;whiteSpace=wrap;html=1;",
}

# 流程圖專用形狀
FLOWCHART_SHAPES = {
    "start": ("ellipse", ColorPalette.GREEN),     # 開始
    "end": ("ellipse", ColorPalette.RED),         # 結束
    "process": ("rectangle", ColorPalette.BLUE),  # 處理
    "decision": ("rhombus", ColorPalette.YELLOW), # 決策
    "data": ("parallelogram", ColorPalette.ORANGE),  # 資料
    "database": ("cylinder", ColorPalette.PURPLE),   # 資料庫
}


def get_edge_style_string(
    style: EdgeStyle = EdgeStyle.ORTHOGONAL,
    arrow_start: ArrowStyle = ArrowStyle.NONE,
    arrow_end: ArrowStyle = ArrowStyle.CLASSIC,
    stroke_width: int = 2,
    stroke_color: str = "#666666",
) -> str:
    """
    生成連接線樣式字串
    
    推薦使用 orthogonal（正交轉角線），而非直線
    這樣可以避免線條穿過其他形狀
    """
    base_style = EDGE_STYLES.get(style, EDGE_STYLES[EdgeStyle.ORTHOGONAL])
    
    parts = [
        base_style,
        f"strokeWidth={stroke_width};",
        f"strokeColor={stroke_color};",
        "html=1;",
    ]
    
    if arrow_start != ArrowStyle.NONE:
        parts.append(f"startArrow={arrow_start.value};startFill=1;")
    else:
        parts.append("startArrow=none;")
        
    if arrow_end != ArrowStyle.NONE:
        parts.append(f"endArrow={arrow_end.value};endFill=1;")
    else:
        parts.append("endArrow=none;")
    
    return "".join(parts)


def get_shape_style_string(
    shape: str = "rectangle",
    fill_color: str = "#dae8fc",
    stroke_color: str = "#6c8ebf",
    stroke_width: int = 2,
    font_size: int = 12,
    rounded: bool = True,
) -> str:
    """
    生成形狀樣式字串
    """
    base_style = SHAPE_STYLES.get(shape, SHAPE_STYLES["rectangle"])
    
    parts = [
        base_style,
        f"fillColor={fill_color};",
        f"strokeColor={stroke_color};",
        f"strokeWidth={stroke_width};",
        f"fontSize={font_size};",
    ]
    
    if rounded and shape == "rectangle":
        # 確保 rounded 已在 base_style 中
        pass
    
    return "".join(parts)


def get_guidelines_text() -> str:
    """
    取得繪圖指南的文字說明（供 Agent 參考）
    """
    return """
# Draw.io 繪圖指南 / Drawing Guidelines

## 🔗 連接線規範 / Edge Guidelines

### 推薦：使用正交轉角線 (Orthogonal)
```
style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;"
```

**為什麼用轉角線而非直線？**
- ✅ 自動避開其他形狀
- ✅ 圖表更整齊專業
- ✅ 線條轉折處圓滑美觀
- ✅ 更容易閱讀流程方向

### 連接線樣式對照表
| 樣式 | style 參數 | 適用情境 |
|------|-----------|----------|
| 正交轉角線 | `edgeStyle=orthogonalEdgeStyle;rounded=1;` | 流程圖、架構圖（推薦） |
| 直線 | `edgeStyle=none;` | 簡單連接、心智圖 |
| 曲線 | `edgeStyle=orthogonalEdgeStyle;curved=1;` | 優雅的流程 |
| ER關係線 | `edgeStyle=entityRelationEdgeStyle;` | ER圖 |

### 箭頭樣式
| 箭頭 | 參數 | 說明 |
|------|------|------|
| 標準 | `endArrow=classic;` | 預設推薦 |
| 方塊 | `endArrow=block;` | 強調終點 |
| 開放 | `endArrow=open;` | 輕量風格 |
| 菱形 | `endArrow=diamond;` | 聚合關係 |
| 無 | `endArrow=none;` | 雙向或無方向 |

## 🎨 顏色規範 / Color Palette

| 用途 | fillColor | strokeColor | 適用 |
|------|-----------|-------------|------|
| 藍色-處理 | #dae8fc | #6c8ebf | 一般處理步驟 |
| 綠色-開始 | #d5e8d4 | #82b366 | 開始、成功 |
| 黃色-決策 | #fff2cc | #d6b656 | 決策、判斷 |
| 橘色-輸出 | #ffe6cc | #d79b00 | 輸出、警告 |
| 紫色-外部 | #e1d5e7 | #9673a6 | 外部系統 |
| 紅色-結束 | #f8cecc | #b85450 | 結束、錯誤 |
| 灰色-容器 | #f5f5f5 | #666666 | 分組容器 |

## 📐 形狀規範 / Shape Guidelines

### 流程圖標準形狀
| 形狀 | style | 用途 |
|------|-------|------|
| 圓角矩形 | `rounded=1;whiteSpace=wrap;html=1;` | 處理步驟 |
| 橢圓 | `ellipse;whiteSpace=wrap;html=1;` | 開始/結束 |
| 菱形 | `rhombus;whiteSpace=wrap;html=1;` | 決策判斷 |
| 平行四邊形 | `shape=parallelogram;` | 輸入/輸出 |
| 圓柱 | `shape=cylinder3;` | 資料庫 |

### 建議尺寸
- 最小寬度: 80px
- 最小高度: 40px
- 水平間距: 60px
- 垂直間距: 40px
- 畫布邊距: 40px

## 📝 XML 範例 / XML Examples

### 正交轉角線連接
```xml
<mxCell id="edge1" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;strokeWidth=2;" edge="1" parent="1" source="box1" target="box2">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### 帶標籤的連接線
```xml
<mxCell id="edge2" value="Yes" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;align=center;verticalAlign=middle;fontStyle=1;" edge="1" parent="1" source="decision" target="process">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### 標準處理步驟
```xml
<mxCell id="process1" value="處理步驟" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```
"""


def get_guidelines_for_diagram_type(diagram_type: str) -> str:
    """
    取得特定圖表類型的繪圖建議
    """
    guidelines = {
        "flowchart": """
## 流程圖專用指南

### 形狀對應
- 開始/結束 → 橢圓 (綠色/紅色)
- 處理步驟 → 圓角矩形 (藍色)
- 決策判斷 → 菱形 (黃色)
- 資料輸入/輸出 → 平行四邊形 (橘色)

### 連接線規則
- **必須使用正交轉角線**（edgeStyle=orthogonalEdgeStyle）
- 決策分支標註 Yes/No
- 流向由上到下或由左到右

### 範例 edge style
```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;strokeWidth=2;
```
""",
        "sequence": """
## 序列圖專用指南

### 參與者樣式
- 使用圓角矩形置於頂部
- 生命線用虛線向下延伸

### 訊息線規則
- 同步訊息：實線 + 實心箭頭
- 非同步訊息：實線 + 開放箭頭
- 回應：虛線 + 開放箭頭

### 範例
```
style="edgeStyle=orthogonalEdgeStyle;html=1;endArrow=classic;dashed=0;"
style="edgeStyle=orthogonalEdgeStyle;html=1;endArrow=open;dashed=1;"
```
""",
        "er": """
## ER 圖專用指南

### 實體樣式
- 使用矩形表示實體
- 主鍵加底線或粗體

### 關係線規則
- 使用 entityRelationEdgeStyle
- 用 diamond 箭頭表示關係
- 標註基數 (1:1, 1:N, M:N)

### 範例
```
style="edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERmandOne;startArrow=ERmany;"
```
""",
        "architecture": """
## 系統架構圖專用指南

### 分層建議
- 用虛線框（container）分組
- 外部系統用紫色
- 資料庫用圓柱形

### 連接線規則
- 使用正交轉角線
- 不同協議用不同線條樣式
- 標註 API/協議名稱

### 範例容器
```xml
<mxCell value="Backend Services" style="rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#666666;strokeWidth=2;dashed=1;dashPattern=8 8;verticalAlign=top;fontSize=14;fontStyle=1;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="300" height="200" as="geometry"/>
</mxCell>
```
"""
    }
    
    base_guide = guidelines.get(diagram_type, "")
    if not base_guide:
        base_guide = """
## 一般圖表指南

### 基本規則
1. 使用正交轉角線連接
2. 保持顏色一致性
3. 對齊網格 (gridSize=20)
4. 保持適當間距
"""
    
    return base_guide


# 預設指南實例
DEFAULT_GUIDELINES = DrawingGuidelines()
