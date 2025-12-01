/**
 * Diagram Operations Handler
 * 
 * 處理來自 MCP 的增量操作，應用到 Draw.io 圖表
 */

import { DiagramDiffTracker, DiagramDiff, MxCellData } from './diagram-diff-tracker';

export interface DiagramOperation {
  op: 'add_node' | 'modify_node' | 'delete_node' | 'add_edge' | 'modify_edge' | 'delete_edge' | 'move' | 'style';
  id?: string;
  [key: string]: any;
}

export interface ApplyResult {
  success: boolean;
  applied: number;
  conflicts: ConflictInfo[];
  newXml?: string;
  newStateSummary?: string;
}

export interface ConflictInfo {
  operationIndex: number;
  description: string;
  resolution: 'skipped' | 'forced' | 'merged';
}

export interface DiagramElement {
  id: string;
  type: 'node' | 'edge';
  value?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  source?: string;
  target?: string;
  style?: string;
}

// 節點類型到 Draw.io style 的對應
const NODE_STYLES: Record<string, string> = {
  rectangle: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;',
  ellipse: 'ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;',
  rhombus: 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;',
  cylinder: 'shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;',
  parallelogram: 'shape=parallelogram;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;',
  hexagon: 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;',
  document: 'shape=document;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;',
  cloud: 'ellipse;shape=cloud;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;',
};

const DEFAULT_EDGE_STYLE = 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;strokeWidth=2;strokeColor=#666666;';

export class DiagramOperationsHandler {
  private tracker: DiagramDiffTracker;
  private currentXml: string = '';
  private nextId: number = 100;

  constructor() {
    this.tracker = new DiagramDiffTracker();
  }

  /**
   * 設定當前的 XML 狀態
   */
  setCurrentXml(xml: string): void {
    this.currentXml = xml;
    this.tracker.setBase(xml);
    // 計算下一個可用的 ID
    this.nextId = this.calculateNextId(xml);
  }

  /**
   * 更新 XML（用戶編輯後）
   */
  updateXml(xml: string): void {
    this.currentXml = xml;
    this.tracker.update(xml);
  }

  /**
   * 取得用戶變更
   */
  getHumanChanges(): {
    hasChanges: boolean;
    operations: {
      added: { id: string; type: string; value: string }[];
      modified: { id: string; field: string; before: any; after: any }[];
      deleted: { id: string; type: string; value?: string }[];
    };
    summary: string;
    details?: string;
  } {
    const diff = this.tracker.getDiff();
    
    const operations = {
      added: diff.added.map(cell => ({
        id: cell.id,
        type: cell.vertex ? 'node' : cell.edge ? 'edge' : 'unknown',
        value: cell.value || '',
      })),
      modified: diff.modified.flatMap(mod => {
        const changes: { id: string; field: string; before: any; after: any }[] = [];
        if (mod.after.value !== undefined) {
          changes.push({ id: mod.id, field: 'value', before: mod.before.value, after: mod.after.value });
        }
        if (mod.after.geometry !== undefined) {
          changes.push({ id: mod.id, field: 'position', before: mod.before.geometry, after: mod.after.geometry });
        }
        if (mod.after.style !== undefined) {
          changes.push({ id: mod.id, field: 'style', before: mod.before.style, after: mod.after.style });
        }
        return changes;
      }),
      deleted: diff.deleted.map(id => ({
        id,
        type: 'unknown',
        value: undefined,
      })),
    };

    return {
      hasChanges: this.tracker.hasChanges(),
      operations,
      summary: diff.summary,
    };
  }

  /**
   * 應用一系列操作
   */
  applyOperations(
    operations: DiagramOperation[],
    preserveUserChanges: boolean = true
  ): ApplyResult {
    const conflicts: ConflictInfo[] = [];
    let applied = 0;
    let xml = this.currentXml;

    // 如果要保留用戶變更，先檢查衝突
    const userChanges = preserveUserChanges ? this.tracker.getDiff() : null;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      
      try {
        // 檢查衝突
        if (userChanges && this.hasConflict(op, userChanges)) {
          conflicts.push({
            operationIndex: i,
            description: `Operation ${op.op} on ${op.id} conflicts with user changes`,
            resolution: 'skipped',
          });
          continue;
        }

        // 應用操作
        xml = this.applyOperation(xml, op);
        applied++;
      } catch (e) {
        conflicts.push({
          operationIndex: i,
          description: `Failed to apply ${op.op}: ${e}`,
          resolution: 'skipped',
        });
      }
    }

    // 更新狀態
    this.currentXml = xml;
    this.tracker.setBase(xml);

    return {
      success: applied > 0,
      applied,
      conflicts,
      newXml: xml,
      newStateSummary: this.getStateSummary(),
    };
  }

  /**
   * 取得圖表元素列表
   */
  getElements(type?: 'nodes' | 'edges'): DiagramElement[] {
    const elements: DiagramElement[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.currentXml, 'text/xml');
    const cells = doc.getElementsByTagName('mxCell');

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const id = cell.getAttribute('id');
      if (!id || id === '0' || id === '1') continue; // 跳過根元素

      const isVertex = cell.getAttribute('vertex') === '1';
      const isEdge = cell.getAttribute('edge') === '1';

      if (type === 'nodes' && !isVertex) continue;
      if (type === 'edges' && !isEdge) continue;

      const element: DiagramElement = {
        id,
        type: isVertex ? 'node' : isEdge ? 'edge' : 'node',
        value: cell.getAttribute('value') || undefined,
        style: cell.getAttribute('style') || undefined,
      };

      if (isVertex) {
        const geometry = cell.getElementsByTagName('mxGeometry')[0];
        if (geometry) {
          element.position = {
            x: parseFloat(geometry.getAttribute('x') || '0'),
            y: parseFloat(geometry.getAttribute('y') || '0'),
          };
          element.size = {
            width: parseFloat(geometry.getAttribute('width') || '0'),
            height: parseFloat(geometry.getAttribute('height') || '0'),
          };
        }
      }

      if (isEdge) {
        element.source = cell.getAttribute('source') || undefined;
        element.target = cell.getAttribute('target') || undefined;
      }

      elements.push(element);
    }

    return elements;
  }

  /**
   * 同步狀態
   */
  syncState(): { nodeCount: number; edgeCount: number; timestamp: number } {
    this.tracker.commit();
    const elements = this.getElements();
    
    return {
      nodeCount: elements.filter(e => e.type === 'node').length,
      edgeCount: elements.filter(e => e.type === 'edge').length,
      timestamp: Date.now(),
    };
  }

  // === 私有方法 ===

  private applyOperation(xml: string, op: DiagramOperation): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const root = doc.getElementsByTagName('root')[0];
    
    if (!root) {
      throw new Error('Invalid XML: no root element');
    }

    switch (op.op) {
      case 'add_node':
        return this.applyAddNode(doc, root, op);
      case 'modify_node':
        return this.applyModifyNode(doc, op);
      case 'delete_node':
        return this.applyDeleteNode(doc, op);
      case 'add_edge':
        return this.applyAddEdge(doc, root, op);
      case 'modify_edge':
        return this.applyModifyEdge(doc, op);
      case 'delete_edge':
        return this.applyDeleteEdge(doc, op);
      default:
        throw new Error(`Unknown operation: ${op.op}`);
    }
  }

  private applyAddNode(doc: Document, root: Element, op: DiagramOperation): string {
    const id = op.id || `node-${this.nextId++}`;
    const nodeType = op.node_type || 'rectangle';
    const style = op.style || NODE_STYLES[nodeType] || NODE_STYLES.rectangle;
    const pos = op.position || { x: 100, y: 100 };
    const size = op.size || { width: 120, height: 60 };
    const value = op.value || '';

    const cell = doc.createElement('mxCell');
    cell.setAttribute('id', id);
    cell.setAttribute('value', value);
    cell.setAttribute('style', style);
    cell.setAttribute('vertex', '1');
    cell.setAttribute('parent', op.parent || '1');

    const geometry = doc.createElement('mxGeometry');
    geometry.setAttribute('x', String(pos.x));
    geometry.setAttribute('y', String(pos.y));
    geometry.setAttribute('width', String(size.width));
    geometry.setAttribute('height', String(size.height));
    geometry.setAttribute('as', 'geometry');

    cell.appendChild(geometry);
    root.appendChild(cell);

    return new XMLSerializer().serializeToString(doc);
  }

  private applyAddEdge(doc: Document, root: Element, op: DiagramOperation): string {
    const id = op.id || `edge-${this.nextId++}`;
    const style = op.style || DEFAULT_EDGE_STYLE;
    const source = op.source;
    const target = op.target;
    const value = op.value || '';

    if (!source || !target) {
      throw new Error('Edge requires source and target');
    }

    const cell = doc.createElement('mxCell');
    cell.setAttribute('id', id);
    cell.setAttribute('value', value);
    cell.setAttribute('style', style);
    cell.setAttribute('edge', '1');
    cell.setAttribute('parent', '1');
    cell.setAttribute('source', source);
    cell.setAttribute('target', target);

    const geometry = doc.createElement('mxGeometry');
    geometry.setAttribute('relative', '1');
    geometry.setAttribute('as', 'geometry');

    cell.appendChild(geometry);
    root.appendChild(cell);

    return new XMLSerializer().serializeToString(doc);
  }

  private applyModifyNode(doc: Document, op: DiagramOperation): string {
    const cell = this.findCell(doc, op.id!);
    if (!cell) {
      throw new Error(`Node not found: ${op.id}`);
    }

    if (op.value !== undefined) {
      cell.setAttribute('value', op.value);
    }
    if (op.style !== undefined) {
      cell.setAttribute('style', op.style);
    }
    if (op.position !== undefined) {
      const geometry = cell.getElementsByTagName('mxGeometry')[0];
      if (geometry) {
        geometry.setAttribute('x', String(op.position.x));
        geometry.setAttribute('y', String(op.position.y));
      }
    }
    if (op.size !== undefined) {
      const geometry = cell.getElementsByTagName('mxGeometry')[0];
      if (geometry) {
        geometry.setAttribute('width', String(op.size.width));
        geometry.setAttribute('height', String(op.size.height));
      }
    }

    return new XMLSerializer().serializeToString(doc);
  }

  private applyModifyEdge(doc: Document, op: DiagramOperation): string {
    const cell = this.findCell(doc, op.id!);
    if (!cell) {
      throw new Error(`Edge not found: ${op.id}`);
    }

    if (op.value !== undefined) {
      cell.setAttribute('value', op.value);
    }
    if (op.style !== undefined) {
      cell.setAttribute('style', op.style);
    }
    if (op.source !== undefined) {
      cell.setAttribute('source', op.source);
    }
    if (op.target !== undefined) {
      cell.setAttribute('target', op.target);
    }

    return new XMLSerializer().serializeToString(doc);
  }

  private applyDeleteNode(doc: Document, op: DiagramOperation): string {
    const cell = this.findCell(doc, op.id!);
    if (cell && cell.parentNode) {
      cell.parentNode.removeChild(cell);
    }
    return new XMLSerializer().serializeToString(doc);
  }

  private applyDeleteEdge(doc: Document, op: DiagramOperation): string {
    return this.applyDeleteNode(doc, op); // Same logic
  }

  private findCell(doc: Document, id: string): Element | null {
    const cells = doc.getElementsByTagName('mxCell');
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].getAttribute('id') === id) {
        return cells[i];
      }
    }
    return null;
  }

  private hasConflict(op: DiagramOperation, userChanges: DiagramDiff): boolean {
    if (op.op === 'modify_node' || op.op === 'delete_node') {
      // 檢查用戶是否也修改了這個節點
      const userModified = userChanges.modified.find(m => m.id === op.id);
      if (userModified) return true;
      
      const userDeleted = userChanges.deleted.includes(op.id!);
      if (userDeleted) return true;
    }
    return false;
  }

  private calculateNextId(xml: string): number {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const cells = doc.getElementsByTagName('mxCell');
    
    let maxId = 100;
    for (let i = 0; i < cells.length; i++) {
      const id = cells[i].getAttribute('id');
      if (id) {
        const numMatch = id.match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (num >= maxId) maxId = num + 1;
        }
      }
    }
    return maxId;
  }

  private getStateSummary(): string {
    const elements = this.getElements();
    const nodes = elements.filter(e => e.type === 'node');
    const edges = elements.filter(e => e.type === 'edge');
    
    return `${nodes.length} nodes, ${edges.length} edges`;
  }
}

// 單例
export const diagramOpsHandler = new DiagramOperationsHandler();
