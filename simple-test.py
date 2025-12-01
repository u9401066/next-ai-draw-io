#!/usr/bin/env python3
import asyncio
import sys
sys.path.insert(0, 'mcp-server/src')
from drawio_mcp_server.web_client import web_client

async def test():
    print("測試 Web 連線...")
    if web_client.is_running(retries=1):
        print("✅ Web 服務正在運行")
    else:
        print("❌ Web 服務未運行")
        return
    
    print("\n測試顯示圖表...")
    xml = '<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'
    result = await web_client.send(action='display', xml=xml, tab_name='Test')
    print(f"結果: {result}")
    
    print("\n✅ 測試完成")

asyncio.run(test())
