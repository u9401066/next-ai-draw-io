/**
 * Diagram Diff Tracker
 * 
 * 追蹤圖表的增量變更，減少 token 消耗
 * 
 * 使用方式:
 * 1. 載入圖表時: tracker.setBase(xml)
 * 2. 每次 autosave 時: tracker.update(newXml)
 * 3. 需要發送給 Agent 時: tracker.getDiff()
 */

export interface MxCellData {
  id: string;
  value?: string;
  style?: string;
  vertex?: boolean;
  edge?: boolean;
  parent?: string;
  source?: string;
  target?: string;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

export interface DiagramDiff {
  added: MxCellData[];
  modified: {
    id: string;
    before: Partial<MxCellData>;
    after: Partial<MxCellData>;
  }[];
  deleted: string[];
  summary: string;  // 人類可讀的摘要
}

export interface DiagramState {
  cells: Map<string, MxCellData>;
  xml: string;
}

export class DiagramDiffTracker {
  private baseState: DiagramState | null = null;
  private currentState: DiagramState | null = null;

  constructor() {}

  /**
   * 設定基準狀態 (通常是 Agent 回應後的狀態)
   */
  setBase(xml: string): void {
    this.baseState = this.parseXmlString(xml);
    this.currentState = this.baseState;
  }

  /**
   * 更新當前狀態 (每次 autosave 時呼叫)
   */
  update(xml: string): void {
    this.currentState = this.parseXmlString(xml);
  }

  /**
   * 計算差異
   */
  getDiff(): DiagramDiff {
    if (!this.baseState || !this.currentState) {
      return { added: [], modified: [], deleted: [], summary: 'No changes' };
    }

    const added: MxCellData[] = [];
    const modified: DiagramDiff['modified'] = [];
    const deleted: string[] = [];

    // 找出新增和修改的元素
    for (const [id, cell] of this.currentState.cells) {
      const baseCell = this.baseState.cells.get(id);
      
      if (!baseCell) {
        // 新增
        added.push(cell);
      } else if (!this.isCellEqual(baseCell, cell)) {
        // 修改
        modified.push({
          id,
          before: this.getCellDiff(baseCell, cell).before,
          after: this.getCellDiff(baseCell, cell).after,
        });
      }
    }

    // 找出刪除的元素
    for (const [id] of this.baseState.cells) {
      if (!this.currentState.cells.has(id)) {
        deleted.push(id);
      }
    }

    // 生成摘要
    const summary = this.generateSummary(added, modified, deleted);

    return { added, modified, deleted, summary };
  }

  /**
   * 取得簡化的差異摘要 (供 Agent 參考)
   */
  getSummary(): string {
    const diff = this.getDiff();
    return diff.summary;
  }

  /**
   * 檢查是否有變更
   */
  hasChanges(): boolean {
    const diff = this.getDiff();
    return diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0;
  }

  /**
   * 重設基準到當前狀態 (Agent 處理完後呼叫)
   */
  commit(): void {
    if (this.currentState) {
      this.baseState = this.currentState;
    }
  }

  // === 私有方法 ===

  private parseXmlString(xml: string): DiagramState {
    const cells = new Map<string, MxCellData>();
    
    try {
      // 使用瀏覽器原生 DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const mxCells = doc.getElementsByTagName('mxCell');
      
      for (let i = 0; i < mxCells.length; i++) {
        const cell = mxCells[i];
        const id = cell.getAttribute('id');
        if (!id) continue;
        
        const cellData: MxCellData = {
          id,
          value: cell.getAttribute('value') || undefined,
          style: cell.getAttribute('style') || undefined,
          vertex: cell.getAttribute('vertex') === '1',
          edge: cell.getAttribute('edge') === '1',
          parent: cell.getAttribute('parent') || undefined,
          source: cell.getAttribute('source') || undefined,
          target: cell.getAttribute('target') || undefined,
        };

        // 解析 geometry
        const geometry = cell.getElementsByTagName('mxGeometry')[0];
        if (geometry) {
          cellData.geometry = {
            x: parseFloat(geometry.getAttribute('x') || '0'),
            y: parseFloat(geometry.getAttribute('y') || '0'),
            width: parseFloat(geometry.getAttribute('width') || '0'),
            height: parseFloat(geometry.getAttribute('height') || '0'),
          };
        }

        cells.set(id, cellData);
      }
    } catch (e) {
      console.error('Failed to parse XML:', e);
    }

    return { cells, xml };
  }

  private isCellEqual(a: MxCellData, b: MxCellData): boolean {
    return (
      a.value === b.value &&
      a.style === b.style &&
      a.parent === b.parent &&
      a.source === b.source &&
      a.target === b.target &&
      this.isGeometryEqual(a.geometry, b.geometry)
    );
  }

  private isGeometryEqual(
    a?: MxCellData['geometry'],
    b?: MxCellData['geometry']
  ): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      Math.abs((a.x || 0) - (b.x || 0)) < 1 &&
      Math.abs((a.y || 0) - (b.y || 0)) < 1 &&
      Math.abs((a.width || 0) - (b.width || 0)) < 1 &&
      Math.abs((a.height || 0) - (b.height || 0)) < 1
    );
  }

  private getCellDiff(
    before: MxCellData,
    after: MxCellData
  ): { before: Partial<MxCellData>; after: Partial<MxCellData> } {
    const beforeDiff: Partial<MxCellData> = {};
    const afterDiff: Partial<MxCellData> = {};

    if (before.value !== after.value) {
      beforeDiff.value = before.value;
      afterDiff.value = after.value;
    }
    if (before.style !== after.style) {
      beforeDiff.style = before.style;
      afterDiff.style = after.style;
    }
    if (!this.isGeometryEqual(before.geometry, after.geometry)) {
      beforeDiff.geometry = before.geometry;
      afterDiff.geometry = after.geometry;
    }
    if (before.source !== after.source) {
      beforeDiff.source = before.source;
      afterDiff.source = after.source;
    }
    if (before.target !== after.target) {
      beforeDiff.target = before.target;
      afterDiff.target = after.target;
    }

    return { before: beforeDiff, after: afterDiff };
  }

  private generateSummary(
    added: MxCellData[],
    modified: DiagramDiff['modified'],
    deleted: string[]
  ): string {
    const parts: string[] = [];

    if (added.length > 0) {
      const nodes = added.filter(c => c.vertex);
      const edges = added.filter(c => c.edge);
      if (nodes.length > 0) {
        const names = nodes.map(n => n.value || 'unnamed').join(', ');
        parts.push(`Added ${nodes.length} node(s): ${names}`);
      }
      if (edges.length > 0) {
        parts.push(`Added ${edges.length} connection(s)`);
      }
    }

    if (modified.length > 0) {
      const textChanges = modified.filter(m => m.after.value !== undefined);
      const positionChanges = modified.filter(m => m.after.geometry !== undefined);
      const styleChanges = modified.filter(m => m.after.style !== undefined);
      
      if (textChanges.length > 0) {
        parts.push(`Changed text of ${textChanges.length} element(s)`);
      }
      if (positionChanges.length > 0) {
        parts.push(`Moved ${positionChanges.length} element(s)`);
      }
      if (styleChanges.length > 0) {
        parts.push(`Changed style of ${styleChanges.length} element(s)`);
      }
    }

    if (deleted.length > 0) {
      parts.push(`Deleted ${deleted.length} element(s)`);
    }

    return parts.length > 0 ? parts.join('; ') : 'No changes';
  }
}

// === 工具函數 ===

/**
 * 比較兩個 XML 字串並返回差異
 */
export function compareDiagrams(before: string, after: string): DiagramDiff {
  const tracker = new DiagramDiffTracker();
  tracker.setBase(before);
  tracker.update(after);
  return tracker.getDiff();
}

/**
 * 將 DiagramDiff 轉換為 Agent 友好的格式
 */
export function diffToAgentFormat(diff: DiagramDiff): string {
  const lines: string[] = [
    '## User made the following changes to the diagram:',
    '',
    diff.summary,
    '',
  ];

  if (diff.added.length > 0) {
    lines.push('### Added Elements:');
    for (const cell of diff.added) {
      if (cell.vertex) {
        lines.push(`- Node "${cell.value || 'unnamed'}" (id: ${cell.id})`);
      } else if (cell.edge) {
        lines.push(`- Connection from ${cell.source} to ${cell.target}`);
      }
    }
    lines.push('');
  }

  if (diff.modified.length > 0) {
    lines.push('### Modified Elements:');
    for (const mod of diff.modified) {
      const changes: string[] = [];
      if (mod.after.value !== undefined) {
        changes.push(`text: "${mod.before.value}" → "${mod.after.value}"`);
      }
      if (mod.after.geometry !== undefined) {
        changes.push('position changed');
      }
      if (mod.after.style !== undefined) {
        changes.push('style changed');
      }
      lines.push(`- Element ${mod.id}: ${changes.join(', ')}`);
    }
    lines.push('');
  }

  if (diff.deleted.length > 0) {
    lines.push('### Deleted Elements:');
    for (const id of diff.deleted) {
      lines.push(`- Element id: ${id}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
