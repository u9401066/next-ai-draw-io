"""
Draw.io MCP Tools - 繪圖指南工具
Drawing Guidelines Tools for Draw.io MCP
"""

from typing import Optional, Literal

from ..drawing_guidelines import (
    get_guidelines_text,
    get_guidelines_for_diagram_type,
    get_edge_style_string,
    get_shape_style_string,
    EdgeStyle,
    ArrowStyle,
    ColorPalette,
    DEFAULT_GUIDELINES,
    EDGE_STYLES,
    SHAPE_STYLES,
    FLOWCHART_SHAPES,
)


async def get_drawing_guidelines_impl(
    diagram_type: Optional[str] = None,
    section: Optional[str] = None,
) -> str:
    """
    取得繪圖指南
    
    Args:
        diagram_type: 圖表類型 (flowchart, sequence, er, architecture)
        section: 指定區段 (edges, colors, shapes, layout, all)
    
    Returns:
        繪圖指南文字
    """
    result_parts = []
    
    # 基本指南
    if section is None or section == "all":
        result_parts.append(get_guidelines_text())
    elif section == "edges":
        result_parts.append(_get_edge_guidelines())
    elif section == "colors":
        result_parts.append(_get_color_guidelines())
    elif section == "shapes":
        result_parts.append(_get_shape_guidelines())
    elif section == "layout":
        result_parts.append(_get_layout_guidelines())
    
    # 特定圖表類型指南
    if diagram_type:
        type_guide = get_guidelines_for_diagram_type(diagram_type)
        if type_guide:
            result_parts.append(f"\n---\n{type_guide}")
    
    return "\n".join(result_parts)


async def get_style_string_impl(
    element_type: Literal["edge", "shape"],
    style: Optional[str] = None,
    color: Optional[str] = None,
    arrow_start: Optional[str] = None,
    arrow_end: Optional[str] = None,
) -> str:
    """
    生成 Draw.io style 字串
    
    Args:
        element_type: 元素類型 (edge 或 shape)
        style: 樣式名稱
            - edge: orthogonal, straight, curved, entityRelation
            - shape: rectangle, ellipse, rhombus, parallelogram, cylinder
        color: 顏色名稱 (blue, green, yellow, orange, purple, red, gray)
        arrow_start: 起始箭頭 (classic, block, open, oval, diamond, none)
        arrow_end: 結束箭頭 (classic, block, open, oval, diamond, none)
    
    Returns:
        可直接使用的 style 字串
    """
    # 顏色對照
    color_map = {
        "blue": ColorPalette.BLUE,
        "green": ColorPalette.GREEN,
        "yellow": ColorPalette.YELLOW,
        "orange": ColorPalette.ORANGE,
        "purple": ColorPalette.PURPLE,
        "red": ColorPalette.RED,
        "gray": ColorPalette.GRAY,
        "white": ColorPalette.WHITE,
    }
    
    if element_type == "edge":
        # 連接線樣式
        edge_style_map = {
            "orthogonal": EdgeStyle.ORTHOGONAL,
            "straight": EdgeStyle.STRAIGHT,
            "curved": EdgeStyle.CURVED,
            "entityRelation": EdgeStyle.ENTITY_RELATION,
        }
        
        arrow_map = {
            "classic": ArrowStyle.CLASSIC,
            "block": ArrowStyle.BLOCK,
            "open": ArrowStyle.OPEN,
            "oval": ArrowStyle.OVAL,
            "diamond": ArrowStyle.DIAMOND,
            "none": ArrowStyle.NONE,
        }
        
        edge_s = edge_style_map.get(style or "orthogonal", EdgeStyle.ORTHOGONAL)
        arrow_s = arrow_map.get(arrow_start or "none", ArrowStyle.NONE)
        arrow_e = arrow_map.get(arrow_end or "classic", ArrowStyle.CLASSIC)
        
        result = get_edge_style_string(
            style=edge_s,
            arrow_start=arrow_s,
            arrow_end=arrow_e,
        )
        
        return f'style="{result}"'
        
    elif element_type == "shape":
        # 形狀樣式
        colors = color_map.get(color or "blue", ColorPalette.BLUE)
        
        result = get_shape_style_string(
            shape=style or "rectangle",
            fill_color=colors[0],
            stroke_color=colors[1],
        )
        
        return f'style="{result}"'
    
    return ""


async def list_available_styles_impl() -> str:
    """
    列出所有可用的樣式選項
    
    Returns:
        所有可用樣式的說明
    """
    return """
# 可用樣式列表 / Available Styles

## 連接線樣式 (Edge Styles)
| 名稱 | 說明 | 推薦度 |
|------|------|--------|
| `orthogonal` | 正交轉角線 | ⭐⭐⭐ 推薦 |
| `straight` | 直線 | ⭐ |
| `curved` | 曲線 | ⭐⭐ |
| `entityRelation` | ER圖關係線 | ER圖專用 |

## 箭頭樣式 (Arrow Styles)
| 名稱 | 說明 |
|------|------|
| `classic` | 標準三角形箭頭（預設） |
| `block` | 實心方塊箭頭 |
| `open` | 開放三角形箭頭 |
| `oval` | 圓形 |
| `diamond` | 菱形（用於聚合關係） |
| `none` | 無箭頭 |

## 形狀樣式 (Shape Styles)
| 名稱 | 說明 | 用途 |
|------|------|------|
| `rectangle` | 圓角矩形 | 處理步驟 |
| `ellipse` | 橢圓 | 開始/結束 |
| `rhombus` | 菱形 | 決策 |
| `parallelogram` | 平行四邊形 | 輸入/輸出 |
| `cylinder` | 圓柱 | 資料庫 |
| `hexagon` | 六邊形 | 特殊處理 |
| `document` | 文件 | 文檔輸出 |
| `cloud` | 雲朵 | 外部服務 |

## 顏色名稱 (Color Names)
| 名稱 | fillColor | strokeColor | 建議用途 |
|------|-----------|-------------|----------|
| `blue` | #dae8fc | #6c8ebf | 處理步驟 |
| `green` | #d5e8d4 | #82b366 | 開始/成功 |
| `yellow` | #fff2cc | #d6b656 | 決策/警示 |
| `orange` | #ffe6cc | #d79b00 | 輸出/警告 |
| `purple` | #e1d5e7 | #9673a6 | 外部系統 |
| `red` | #f8cecc | #b85450 | 結束/錯誤 |
| `gray` | #f5f5f5 | #666666 | 容器/背景 |

## 使用範例

### 取得轉角線樣式
```
get_style_string(element_type="edge", style="orthogonal", arrow_end="classic")
→ edgeStyle=orthogonalEdgeStyle;rounded=1;...endArrow=classic;
```

### 取得藍色處理方塊樣式
```
get_style_string(element_type="shape", style="rectangle", color="blue")
→ rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;
```
"""


def register_guideline_tools(mcp):
    """註冊繪圖指南相關工具"""
    
    @mcp.tool(
        description="""取得繪圖指南和最佳實踐。
        
這個工具提供 Draw.io 繪圖的標準指南，包括：
- 連接線樣式（推薦使用正交轉角線）
- 顏色規範
- 形狀建議
- 佈局規則

使用時機：
- 在創建新圖表前查詢最佳實踐
- 確認特定圖表類型的推薦設定
- 取得標準色彩和形狀建議"""
    )
    async def get_drawing_guidelines(
        diagram_type: str = None,
        section: str = None,
    ) -> str:
        """
        取得繪圖指南
        
        Args:
            diagram_type: 圖表類型 (flowchart, sequence, er, architecture)
            section: 指定區段 (edges, colors, shapes, layout, all)
        
        Returns:
            繪圖指南文字
        """
        return await get_drawing_guidelines_impl(diagram_type, section)
    
    @mcp.tool(
        description="""生成 Draw.io style 字串。
        
這個工具幫你生成正確的 Draw.io style 屬性，包括：
- 連接線樣式（orthogonal, straight, curved）
- 箭頭樣式（classic, block, open, oval, diamond, none）
- 形狀樣式和顏色

使用時機：
- 創建圖表時需要正確的 style 字串
- 想確保使用標準樣式和顏色"""
    )
    async def get_style_string(
        element_type: str,
        style: str = None,
        color: str = None,
        arrow_start: str = None,
        arrow_end: str = None,
    ) -> str:
        """
        生成 Draw.io style 字串
        
        Args:
            element_type: 元素類型 (edge 或 shape)
            style: 樣式名稱
            color: 顏色名稱
            arrow_start: 起始箭頭
            arrow_end: 結束箭頭
        
        Returns:
            可直接使用的 style 字串
        """
        return await get_style_string_impl(element_type, style, color, arrow_start, arrow_end)
    
    @mcp.tool(
        description="""列出所有可用的繪圖樣式選項。
        
這個工具列出 Draw.io 中所有可用的：
- 連接線樣式
- 箭頭樣式
- 形狀樣式
- 顏色名稱

使用時機：
- 查看有哪些樣式可用
- 決定圖表的視覺風格"""
    )
    async def list_available_styles() -> str:
        """
        列出所有可用的樣式選項
        
        Returns:
            所有可用樣式的說明
        """
        return await list_available_styles_impl()


def _get_edge_guidelines() -> str:
    """取得連接線指南"""
    return """
# 連接線指南 / Edge Guidelines

## ⭐ 推薦使用正交轉角線

**為什麼？**
- 自動避開其他形狀
- 圖表更整齊專業
- 線條轉折處圓滑

**標準 style:**
```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;strokeWidth=2;strokeColor=#666666;
```

## 各類型對照
| 類型 | style 參數 |
|------|-----------|
| 轉角線 | `edgeStyle=orthogonalEdgeStyle;rounded=1;` |
| 直線 | `edgeStyle=none;` |
| 曲線 | `edgeStyle=orthogonalEdgeStyle;curved=1;` |
"""


def _get_color_guidelines() -> str:
    """取得顏色指南"""
    return """
# 顏色指南 / Color Guidelines

## 標準調色板

```
藍色 (處理): fillColor=#dae8fc;strokeColor=#6c8ebf;
綠色 (開始): fillColor=#d5e8d4;strokeColor=#82b366;
黃色 (決策): fillColor=#fff2cc;strokeColor=#d6b656;
橘色 (輸出): fillColor=#ffe6cc;strokeColor=#d79b00;
紫色 (外部): fillColor=#e1d5e7;strokeColor=#9673a6;
紅色 (結束): fillColor=#f8cecc;strokeColor=#b85450;
灰色 (容器): fillColor=#f5f5f5;strokeColor=#666666;
```

## 使用原則
1. 同類型元素使用相同顏色
2. 開始用綠色，結束用紅色
3. 決策分支用黃色
4. 外部系統用紫色
"""


def _get_shape_guidelines() -> str:
    """取得形狀指南"""
    return """
# 形狀指南 / Shape Guidelines

## 流程圖標準形狀

| 用途 | 形狀 | style |
|------|------|-------|
| 開始/結束 | 橢圓 | `ellipse;whiteSpace=wrap;html=1;` |
| 處理步驟 | 圓角矩形 | `rounded=1;whiteSpace=wrap;html=1;` |
| 決策判斷 | 菱形 | `rhombus;whiteSpace=wrap;html=1;` |
| 輸入/輸出 | 平行四邊形 | `shape=parallelogram;whiteSpace=wrap;html=1;` |
| 資料庫 | 圓柱 | `shape=cylinder3;whiteSpace=wrap;html=1;` |

## 建議尺寸
- 矩形: 120x60 px
- 橢圓: 80x40 px
- 菱形: 100x60 px
"""


def _get_layout_guidelines() -> str:
    """取得佈局指南"""
    return """
# 佈局指南 / Layout Guidelines

## 間距規範
- 水平間距: 60px
- 垂直間距: 40px
- 畫布邊距: 40px
- 網格大小: 20px (對齊用)

## 佈局原則
1. 流程從上到下或從左到右
2. 決策分支對稱排列
3. 同層級元素水平對齊
4. 使用虛線框分組相關元素

## 座標參考
```
畫布範圍建議: x: 40-800, y: 40-600
標準起點: x=100, y=40
垂直遞增: y += 100 (間距+形狀高度)
水平遞增: x += 180 (間距+形狀寬度)
```
"""
