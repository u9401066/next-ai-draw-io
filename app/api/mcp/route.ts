import { NextRequest, NextResponse } from 'next/server';

// 分頁狀態
interface TabState {
  id: string;
  name: string;
  xml: string;
}

// 用戶事件（從瀏覽器觸發的操作）
interface UserEvent {
  type: 'save' | 'autosave' | 'close' | 'change';
  tabId: string;
  tabName: string;
  xml: string;
  timestamp: number;
}

// 儲存所有分頁的圖表狀態（在生產環境中應該用 Redis 或其他持久化方案）
let tabs: TabState[] = [];
let activeTabId: string | null = null;
let pendingUpdates: { 
  xml: string; 
  timestamp: number;
  tabId?: string;
  tabName?: string;
  action: 'display' | 'edit' | 'switch';
}[] = [];

// 用戶事件隊列（讓 Agent 可以查詢）
let userEvents: UserEvent[] = [];

// === Diff 相關狀態 ===
// 儲存基準 XML（用於計算 diff）
let baseXmlState: { [tabId: string]: string } = {};
// 儲存用戶變更摘要（由瀏覽器定期回報）
let humanChanges: {
  hasChanges: boolean;
  operations: {
    added: { id: string; type: string; value: string }[];
    modified: { id: string; field: string; before: any; after: any }[];
    deleted: { id: string; type: string; value?: string }[];
  };
  summary: string;
  timestamp: number;
} | null = null;

// 待應用的操作（MCP 發送，瀏覽器執行）
let pendingOperations: {
  operations: any[];
  preserveUserChanges: boolean;
  requestId: string;
  timestamp: number;
  result?: any;
  resolved: boolean;
}[] = [];

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateTab(tabId?: string, tabName?: string): TabState {
  // 如果指定了 tabId，嘗試找到它
  if (tabId) {
    const existingTab = tabs.find(t => t.id === tabId);
    if (existingTab) {
      activeTabId = existingTab.id;
      return existingTab;
    }
  }
  
  // 創建新分頁
  const newTab: TabState = {
    id: tabId || generateTabId(),
    name: tabName || `Diagram ${tabs.length + 1}`,
    xml: '',
  };
  tabs.push(newTab);
  activeTabId = newTab.id;
  return newTab;
}

// 用於請求瀏覽器 export 最新內容
let exportRequest: { 
  requestId: string; 
  timestamp: number;
  resolved: boolean;
  xml?: string;
} | null = null;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'get') {
    // 獲取當前活躍分頁的圖表
    const activeTab = tabs.find(t => t.id === activeTabId);
    return NextResponse.json({ 
      xml: activeTab?.xml || '',
      tabId: activeTabId,
      tabs: tabs.map(t => ({ id: t.id, name: t.name, active: t.id === activeTabId })),
      timestamp: Date.now() 
    });
  }

  // 新增：請求瀏覽器 export 最新內容
  if (action === 'request_export') {
    const requestId = `export-${Date.now()}`;
    exportRequest = {
      requestId,
      timestamp: Date.now(),
      resolved: false,
    };
    return NextResponse.json({
      requestId,
      message: 'Export requested, browser should respond soon',
    });
  }

  // 新增：檢查 export 結果
  if (action === 'get_export_result') {
    const requestId = searchParams.get('requestId');
    if (!exportRequest || exportRequest.requestId !== requestId) {
      return NextResponse.json({ error: 'No matching export request' }, { status: 404 });
    }
    if (!exportRequest.resolved) {
      return NextResponse.json({ pending: true });
    }
    const result = {
      xml: exportRequest.xml,
      resolved: true,
    };
    exportRequest = null; // 清除已完成的請求
    return NextResponse.json(result);
  }

  // 新增：檢查是否有 export 請求（給瀏覽器 polling 用）
  if (action === 'check_export_request') {
    if (exportRequest && !exportRequest.resolved) {
      return NextResponse.json({
        hasRequest: true,
        requestId: exportRequest.requestId,
      });
    }
    return NextResponse.json({ hasRequest: false });
  }

  if (action === 'poll') {
    // 輪詢等待更新（用於前端即時更新）
    const since = parseInt(searchParams.get('since') || '0');
    const updates = pendingUpdates.filter(u => u.timestamp > since);
    
    if (updates.length > 0) {
      const latestUpdate = updates[updates.length - 1];
      return NextResponse.json({ 
        hasUpdate: true, 
        xml: latestUpdate.xml,
        tabId: latestUpdate.tabId,
        tabName: latestUpdate.tabName,
        action: latestUpdate.action,
        tabs: tabs.map(t => ({ id: t.id, name: t.name, active: t.id === activeTabId })),
        timestamp: latestUpdate.timestamp
      });
    }
    
    return NextResponse.json({ 
      hasUpdate: false, 
      tabs: tabs.map(t => ({ id: t.id, name: t.name, active: t.id === activeTabId })),
      timestamp: Date.now() 
    });
  }

  if (action === 'tabs') {
    // 列出所有分頁
    return NextResponse.json({
      tabs: tabs.map(t => ({ id: t.id, name: t.name, active: t.id === activeTabId })),
      activeTabId,
    });
  }

  if (action === 'events') {
    // 獲取用戶事件（讓 Agent 查詢用戶操作）
    const since = parseInt(searchParams.get('since') || '0');
    const events = userEvents.filter(e => e.timestamp > since);
    
    return NextResponse.json({
      events,
      count: events.length,
      timestamp: Date.now(),
    });
  }

  if (action === 'clear_events') {
    // 清除已處理的事件
    const before = parseInt(searchParams.get('before') || String(Date.now()));
    userEvents = userEvents.filter(e => e.timestamp > before);
    
    return NextResponse.json({
      success: true,
      remaining: userEvents.length,
    });
  }

  // === Diff 相關 GET 處理 ===
  
  if (action === 'get_changes') {
    // 取得用戶變更摘要（給 MCP 用）
    if (!humanChanges) {
      return NextResponse.json({
        success: true,
        changes: {
          hasChanges: false,
          operations: { added: [], modified: [], deleted: [] },
          summary: 'No changes tracked yet',
        }
      });
    }
    return NextResponse.json({
      success: true,
      changes: humanChanges,
    });
  }
  
  if (action === 'check_pending_ops') {
    // 瀏覽器檢查是否有待執行的操作
    const pendingOp = pendingOperations.find(op => !op.resolved);
    if (pendingOp) {
      return NextResponse.json({
        hasPending: true,
        requestId: pendingOp.requestId,
        operations: pendingOp.operations,
        preserveUserChanges: pendingOp.preserveUserChanges,
      });
    }
    return NextResponse.json({ hasPending: false });
  }
  
  if (action === 'get_apply_result') {
    // MCP 取得操作執行結果
    const requestId = searchParams.get('requestId');
    const op = pendingOperations.find(o => o.requestId === requestId);
    if (!op) {
      return NextResponse.json({ error: 'No matching operation' }, { status: 404 });
    }
    if (!op.resolved) {
      return NextResponse.json({ pending: true });
    }
    // 清除已完成的操作
    pendingOperations = pendingOperations.filter(o => o.requestId !== requestId);
    return NextResponse.json({
      success: true,
      result: op.result,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, xml, edits, tabId, tabName } = body;

    if (action === 'display') {
      // 顯示新圖表（在指定分頁或新分頁）
      const tab = getOrCreateTab(tabId, tabName);
      tab.xml = xml;
      if (tabName) tab.name = tabName;
      
      const timestamp = Date.now();
      pendingUpdates.push({ 
        xml, 
        timestamp,
        tabId: tab.id,
        tabName: tab.name,
        action: 'display'
      });
      
      // 只保留最近 50 個更新
      if (pendingUpdates.length > 50) {
        pendingUpdates = pendingUpdates.slice(-50);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Diagram displayed',
        tabId: tab.id,
        tabName: tab.name,
        timestamp 
      });
    }

    if (action === 'edit') {
      // 編輯指定分頁或當前分頁的圖表
      const targetTabId = tabId || activeTabId;
      const tab = tabs.find(t => t.id === targetTabId);
      
      if (!tab) {
        return NextResponse.json({ error: 'No active tab to edit' }, { status: 400 });
      }
      
      let updatedXml = tab.xml;
      if (edits && Array.isArray(edits)) {
        for (const edit of edits) {
          updatedXml = updatedXml.replace(edit.search, edit.replace);
        }
      }
      
      tab.xml = updatedXml;
      const timestamp = Date.now();
      pendingUpdates.push({ 
        xml: updatedXml, 
        timestamp,
        tabId: tab.id,
        tabName: tab.name,
        action: 'edit'
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Diagram edited',
        tabId: tab.id,
        timestamp 
      });
    }

    if (action === 'switch') {
      // 切換到指定分頁
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) {
        return NextResponse.json({ error: `Tab not found: ${tabId}` }, { status: 404 });
      }
      
      activeTabId = tab.id;
      const timestamp = Date.now();
      pendingUpdates.push({
        xml: tab.xml,
        timestamp,
        tabId: tab.id,
        tabName: tab.name,
        action: 'switch'
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Tab switched',
        tabId: tab.id,
        xml: tab.xml,
        timestamp 
      });
    }

    if (action === 'close') {
      // 關閉分頁
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) {
        return NextResponse.json({ error: `Tab not found: ${tabId}` }, { status: 404 });
      }
      
      tabs.splice(tabIndex, 1);
      
      // 如果關閉的是活躍分頁，切換到另一個
      if (tabId === activeTabId) {
        if (tabs.length > 0) {
          activeTabId = tabs[Math.min(tabIndex, tabs.length - 1)].id;
        } else {
          activeTabId = null;
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Tab closed',
        closedId: tabId,
        activeTabId
      });
    }

    if (action === 'sync') {
      // 從前端同步當前分頁狀態
      if (activeTabId) {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
          tab.xml = xml;
        }
      }
      return NextResponse.json({ success: true, message: 'Synced' });
    }

    if (action === 'user_save' || action === 'user_autosave') {
      // 用戶在瀏覽器中觸發的存檔事件
      const eventType = action === 'user_save' ? 'save' : 'autosave';
      const targetTabId = tabId || activeTabId || 'unknown';
      const targetTabName = tabName || tabs.find(t => t.id === targetTabId)?.name || 'Untitled';
      
      // 更新分頁內容
      if (targetTabId && targetTabId !== 'unknown') {
        const tab = tabs.find(t => t.id === targetTabId);
        if (tab && xml) {
          tab.xml = xml;
        }
      }
      
      // 記錄用戶事件
      const event: UserEvent = {
        type: eventType,
        tabId: targetTabId,
        tabName: targetTabName,
        xml: xml || '',
        timestamp: Date.now(),
      };
      userEvents.push(event);
      
      // 只保留最近 100 個事件
      if (userEvents.length > 100) {
        userEvents = userEvents.slice(-100);
      }
      
      console.log(`[MCP] User ${eventType} event received for tab: ${targetTabName}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `User ${eventType} event recorded`,
        eventId: event.timestamp,
      });
    }

    // 新增：瀏覽器回傳 export 結果
    if (action === 'export_result') {
      const { requestId } = body;
      if (exportRequest && exportRequest.requestId === requestId) {
        exportRequest.resolved = true;
        exportRequest.xml = xml;
        
        // 同時更新 tab 內容
        if (activeTabId) {
          const tab = tabs.find(t => t.id === activeTabId);
          if (tab && xml) {
            tab.xml = xml;
          }
        }
        
        return NextResponse.json({ success: true, message: 'Export result received' });
      }
      return NextResponse.json({ error: 'No matching export request' }, { status: 404 });
    }

    // Debug log from browser
    if (action === 'debug_log') {
      const { message, ...rest } = body;
      console.log(`[BROWSER DEBUG] ${message}`, JSON.stringify(rest, null, 2));
      return NextResponse.json({ success: true });
    }

    // === Diff 相關 POST 處理 ===
    
    if (action === 'report_changes') {
      // 瀏覽器回報用戶變更（定期或 export 時）
      const { changes } = body;
      humanChanges = {
        ...changes,
        timestamp: Date.now(),
      };
      return NextResponse.json({ success: true, message: 'Changes reported' });
    }
    
    if (action === 'apply_operations') {
      // MCP 請求應用增量操作到圖表
      const { operations, preserveUserChanges = true, requestId } = body;
      
      pendingOperations.push({
        operations,
        preserveUserChanges,
        requestId: requestId || `op-${Date.now()}`,
        timestamp: Date.now(),
        resolved: false,
      });
      
      return NextResponse.json({
        success: true,
        requestId: requestId || `op-${Date.now()}`,
        message: 'Operations queued for browser execution',
      });
    }
    
    if (action === 'operation_result') {
      // 瀏覽器回報操作執行結果
      const { requestId, result, newXml } = body;
      
      const op = pendingOperations.find(o => o.requestId === requestId);
      if (op) {
        op.resolved = true;
        op.result = result;
        
        // 更新 tab XML
        if (newXml && activeTabId) {
          const tab = tabs.find(t => t.id === activeTabId);
          if (tab) {
            tab.xml = newXml;
          }
        }
        
        return NextResponse.json({ success: true, message: 'Result recorded' });
      }
      return NextResponse.json({ error: 'No matching operation' }, { status: 404 });
    }
    
    if (action === 'set_base_xml') {
      // 設定基準 XML（用於追蹤 diff）
      const targetTabId = tabId || activeTabId;
      if (targetTabId && xml) {
        baseXmlState[targetTabId] = xml;
        // 清除舊的變更記錄
        humanChanges = null;
        return NextResponse.json({ 
          success: true, 
          message: 'Base XML set',
          tabId: targetTabId 
        });
      }
      return NextResponse.json({ error: 'No tab or xml specified' }, { status: 400 });
    }
    
    if (action === 'sync_diff_state') {
      // 同步 diff 狀態（清除變更並設定新基準）
      const targetTabId = tabId || activeTabId;
      if (targetTabId && xml) {
        baseXmlState[targetTabId] = xml;
        humanChanges = null;
        // 清除已完成的操作
        pendingOperations = pendingOperations.filter(o => !o.resolved);
        return NextResponse.json({ 
          success: true, 
          message: 'Diff state synced',
          tabId: targetTabId 
        });
      }
      return NextResponse.json({ error: 'No tab or xml specified' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('MCP Control API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
