import { NextRequest, NextResponse } from 'next/server';

// 分頁狀態（在生產環境中應該用 Redis 或其他持久化方案）
interface Tab {
  id: string;
  name: string;
  xml: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

let tabs: Tab[] = [];
let activeTabId: string | null = null;

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET() {
  return NextResponse.json({
    tabs: tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      active: tab.id === activeTabId,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
    })),
    activeTabId,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, xml } = body;

    switch (action) {
      case 'create': {
        const newTab: Tab = {
          id: generateTabId(),
          name: name || `Diagram ${tabs.length + 1}`,
          xml: xml || '',
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        // 設為活躍分頁
        tabs.forEach(t => t.active = false);
        tabs.push(newTab);
        activeTabId = newTab.id;
        
        return NextResponse.json({
          success: true,
          tab: {
            id: newTab.id,
            name: newTab.name,
            active: true,
          },
        });
      }

      case 'switch': {
        const tab = tabs.find(t => t.id === id);
        if (!tab) {
          return NextResponse.json(
            { error: `Tab not found: ${id}` },
            { status: 404 }
          );
        }
        
        tabs.forEach(t => t.active = false);
        tab.active = true;
        activeTabId = tab.id;
        
        return NextResponse.json({
          success: true,
          tab: {
            id: tab.id,
            name: tab.name,
            active: true,
            xml: tab.xml,
          },
        });
      }

      case 'close': {
        const tabIndex = tabs.findIndex(t => t.id === id);
        if (tabIndex === -1) {
          return NextResponse.json(
            { error: `Tab not found: ${id}` },
            { status: 404 }
          );
        }
        
        const closedTab = tabs[tabIndex];
        tabs.splice(tabIndex, 1);
        
        // 如果關閉的是活躍分頁，切換到另一個
        if (closedTab.id === activeTabId) {
          if (tabs.length > 0) {
            const newActiveIndex = Math.min(tabIndex, tabs.length - 1);
            tabs[newActiveIndex].active = true;
            activeTabId = tabs[newActiveIndex].id;
          } else {
            activeTabId = null;
          }
        }
        
        return NextResponse.json({
          success: true,
          closedId: id,
          activeTabId,
        });
      }

      case 'update': {
        const tab = tabs.find(t => t.id === id);
        if (!tab) {
          return NextResponse.json(
            { error: `Tab not found: ${id}` },
            { status: 404 }
          );
        }
        
        if (name !== undefined) tab.name = name;
        if (xml !== undefined) tab.xml = xml;
        tab.updatedAt = Date.now();
        
        return NextResponse.json({
          success: true,
          tab: {
            id: tab.id,
            name: tab.name,
          },
        });
      }

      case 'get': {
        const tab = id ? tabs.find(t => t.id === id) : tabs.find(t => t.id === activeTabId);
        if (!tab) {
          return NextResponse.json(
            { error: 'No active tab' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          tab: {
            id: tab.id,
            name: tab.name,
            xml: tab.xml,
            active: tab.id === activeTabId,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Tabs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 匯出以便其他模組使用
export function getActiveTab(): Tab | undefined {
  return tabs.find(t => t.id === activeTabId);
}

export function createTab(name: string, xml: string): Tab {
  const newTab: Tab = {
    id: generateTabId(),
    name,
    xml,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  tabs.forEach(t => t.active = false);
  tabs.push(newTab);
  activeTabId = newTab.id;
  
  return newTab;
}
