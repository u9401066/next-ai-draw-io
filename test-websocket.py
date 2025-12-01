#!/usr/bin/env python3
"""
WebSocket 整合測試腳本

測試流程：
1. 透過 Next.js API 發送 display 請求
2. 驗證請求是否被轉發到 WebSocket server
3. 測試 apply_operations
"""

import httpx
import json
import time
import sys

# 設定
NEXTJS_API = "http://localhost:6002/api/mcp"
WS_API = "http://localhost:6004"

def test_ws_server_status():
    """測試 WebSocket server 狀態"""
    print("\n=== 測試 1: WebSocket Server 狀態 ===")
    try:
        response = httpx.get(f"{WS_API}?action=status", timeout=5)
        data = response.json()
        print(f"✅ WebSocket Server 運行中")
        print(f"   WS Port: {data.get('wsPort')}")
        print(f"   API Port: {data.get('apiPort')}")
        print(f"   連線的 clients: {data.get('clients')}")
        return True
    except Exception as e:
        print(f"❌ WebSocket Server 不可用: {e}")
        return False

def test_display_via_nextjs():
    """測試透過 Next.js API 發送 display 請求"""
    print("\n=== 測試 2: 透過 Next.js API 顯示圖表 ===")
    
    test_xml = """<mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="test-1" value="WebSocket Test" style="rounded=1;fillColor=#dae8fc;" 
                vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>"""
    
    try:
        response = httpx.post(
            NEXTJS_API,
            json={
                "action": "display",
                "xml": test_xml,
                "tabName": "WS Test"
            },
            timeout=5
        )
        data = response.json()
        
        if data.get("success"):
            print(f"✅ 圖表顯示請求成功")
            print(f"   Tab ID: {data.get('tabId')}")
            print(f"   Tab Name: {data.get('tabName')}")
            print(f"   WebSocket 轉發: {data.get('wsForwarded', 'N/A')}")
            return True
        else:
            print(f"❌ 請求失敗: {data}")
            return False
    except Exception as e:
        print(f"❌ 請求錯誤: {e}")
        return False

def test_apply_operations():
    """測試透過 Next.js API 發送 apply_operations 請求"""
    print("\n=== 測試 3: 透過 Next.js API 應用操作 ===")
    
    operations = [
        {
            "op": "add_node",
            "id": "ws-node-1",
            "value": "New Node via WS",
            "x": 300,
            "y": 100,
            "width": 100,
            "height": 50
        }
    ]
    
    try:
        response = httpx.post(
            NEXTJS_API,
            json={
                "action": "apply_operations",
                "operations": operations,
                "preserveUserChanges": True
            },
            timeout=5
        )
        data = response.json()
        
        if data.get("success"):
            print(f"✅ 操作請求成功")
            print(f"   Request ID: {data.get('requestId')}")
            print(f"   WebSocket 轉發: {data.get('wsForwarded', 'N/A')}")
            return True
        else:
            print(f"❌ 請求失敗: {data}")
            return False
    except Exception as e:
        print(f"❌ 請求錯誤: {e}")
        return False

def test_direct_ws_api():
    """直接測試 WebSocket HTTP API"""
    print("\n=== 測試 4: 直接調用 WebSocket API ===")
    
    test_xml = "<mxGraphModel><root><mxCell id='0'/></root></mxGraphModel>"
    
    try:
        response = httpx.post(
            WS_API,
            json={
                "action": "display",
                "xml": test_xml,
                "tabId": "direct-test",
                "tabName": "Direct WS Test"
            },
            timeout=5
        )
        data = response.json()
        
        if data.get("success"):
            print(f"✅ 直接 WS API 調用成功")
            return True
        else:
            print(f"❌ 調用失敗: {data}")
            return False
    except Exception as e:
        print(f"❌ 調用錯誤: {e}")
        return False

def main():
    print("=" * 50)
    print("WebSocket 整合測試")
    print("=" * 50)
    
    results = []
    
    # 測試 1: WS server 狀態
    results.append(("WS Server Status", test_ws_server_status()))
    
    # 測試 2: 透過 Next.js 顯示圖表
    results.append(("Display via Next.js", test_display_via_nextjs()))
    
    # 測試 3: 透過 Next.js 應用操作
    results.append(("Apply Operations", test_apply_operations()))
    
    # 測試 4: 直接 WS API
    results.append(("Direct WS API", test_direct_ws_api()))
    
    # 總結
    print("\n" + "=" * 50)
    print("測試結果總結")
    print("=" * 50)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\n通過: {passed}/{total}")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
