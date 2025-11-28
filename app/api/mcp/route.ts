import { NextRequest, NextResponse } from 'next/server';

// 儲存當前的圖表狀態（在生產環境中應該用 Redis 或其他持久化方案）
let currentDiagramXml = '';
let pendingUpdates: { xml: string; timestamp: number }[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'get') {
    // 獲取當前圖表
    return NextResponse.json({ 
      xml: currentDiagramXml,
      timestamp: Date.now() 
    });
  }

  if (action === 'poll') {
    // 輪詢等待更新（用於前端即時更新）
    const since = parseInt(searchParams.get('since') || '0');
    const updates = pendingUpdates.filter(u => u.timestamp > since);
    
    if (updates.length > 0) {
      return NextResponse.json({ 
        hasUpdate: true, 
        xml: updates[updates.length - 1].xml,
        timestamp: updates[updates.length - 1].timestamp
      });
    }
    
    return NextResponse.json({ hasUpdate: false, timestamp: Date.now() });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, xml, edits } = body;

    if (action === 'display') {
      // 顯示新圖表
      currentDiagramXml = xml;
      const timestamp = Date.now();
      pendingUpdates.push({ xml, timestamp });
      
      // 只保留最近 10 個更新
      if (pendingUpdates.length > 10) {
        pendingUpdates = pendingUpdates.slice(-10);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Diagram updated',
        timestamp 
      });
    }

    if (action === 'edit') {
      // 編輯現有圖表
      let updatedXml = currentDiagramXml;
      
      if (edits && Array.isArray(edits)) {
        for (const edit of edits) {
          updatedXml = updatedXml.replace(edit.search, edit.replace);
        }
      }
      
      currentDiagramXml = updatedXml;
      const timestamp = Date.now();
      pendingUpdates.push({ xml: updatedXml, timestamp });

      return NextResponse.json({ 
        success: true, 
        message: 'Diagram edited',
        timestamp 
      });
    }

    if (action === 'sync') {
      // 從前端同步當前狀態
      currentDiagramXml = xml;
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
