import { NextRequest, NextResponse } from 'next/server';

// 分頁狀態
interface TabState {
  id: string;
  name: string;
  xml: string;
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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('MCP Control API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
