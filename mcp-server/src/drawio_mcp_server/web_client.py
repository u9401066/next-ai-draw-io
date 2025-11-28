"""
Web 客戶端 - 管理與 Next.js 前端的通信
"""

import sys
import time
import atexit
import subprocess
import webbrowser
from typing import Optional, Any
import httpx

from .config import config, get_web_dir, get_npm_path


class WebClient:
    """Draw.io Web 前端客戶端"""
    
    def __init__(self):
        self._web_process: Optional[subprocess.Popen] = None
        # 註冊退出時停止 Web 服務
        atexit.register(self.stop_web_server)
    
    def is_running(self) -> bool:
        """檢查 Web 服務是否正在運行"""
        try:
            response = httpx.get(
                f"{config.api_mcp_url}?action=poll", 
                timeout=2
            )
            return response.status_code == 200
        except Exception:
            return False
    
    def start_web_server(self) -> bool:
        """
        啟動 Next.js Web 服務
        
        Returns:
            bool: 是否成功啟動
        """
        if not config.auto_start_web:
            return False
        
        # 檢查是否已經在運行
        if self.is_running():
            print(f"✅ Draw.io Web 已在運行: {config.nextjs_url}", file=sys.stderr)
            return True
        
        web_dir = get_web_dir()
        
        # 確認目錄存在
        if not (web_dir / "package.json").exists():
            print(f"⚠️ 找不到 Next.js 專案: {web_dir}", file=sys.stderr)
            return False
        
        print(f"🚀 正在啟動 Draw.io Web ({web_dir})...", file=sys.stderr)
        
        try:
            npm_path = get_npm_path()
            if not npm_path:
                print(f"❌ 找不到 npm，請確保 Node.js 已安裝", file=sys.stderr)
                return False
            
            print(f"   使用 npm: {npm_path}", file=sys.stderr)
            
            # 啟動 Next.js (背景執行)
            self._web_process = subprocess.Popen(
                [npm_path, "run", "dev"],
                cwd=web_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # 等待啟動
            for i in range(config.web_startup_timeout):
                if self.is_running():
                    print(f"✅ Draw.io Web 已啟動: {config.nextjs_url}", file=sys.stderr)
                    self._open_browser()
                    return True
                time.sleep(1)
                if i % 5 == 4:
                    print(f"   等待啟動中... ({i+1}s)", file=sys.stderr)
            
            # 超時
            if self._web_process.poll() is not None:
                _, stderr = self._web_process.communicate()
                print(f"⚠️ Next.js 啟動失敗: {stderr.decode()[:200]}", file=sys.stderr)
            else:
                print("⚠️ Draw.io Web 啟動超時", file=sys.stderr)
            return False
            
        except Exception as e:
            print(f"❌ 啟動 Web 服務失敗: {e}", file=sys.stderr)
            return False
    
    def stop_web_server(self):
        """停止 Web 服務"""
        if self._web_process:
            try:
                self._web_process.terminate()
                self._web_process.wait(timeout=5)
            except Exception:
                self._web_process.kill()
            self._web_process = None
            print("🛑 Draw.io Web 已停止", file=sys.stderr)
    
    def _open_browser(self):
        """
        嘗試開啟瀏覽器（僅作為備用方案）
        主要依賴 Agent 使用 open_simple_browser 工具
        """
        if not config.auto_open_browser:
            return
        
        try:
            webbrowser.open(config.nextjs_url)
            print(f"🌐 已在系統瀏覽器中開啟: {config.nextjs_url}", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ 無法自動開啟瀏覽器: {e}", file=sys.stderr)
    
    async def send(
        self, 
        action: str, 
        xml: str = "", 
        tab_id: Optional[str] = None,
        tab_name: Optional[str] = None,
        edits: Optional[list] = None
    ) -> dict:
        """
        發送指令到 Next.js 前端
        
        Args:
            action: 動作類型 (display, edit, etc.)
            xml: 圖表 XML
            tab_id: 分頁 ID
            tab_name: 分頁名稱
            edits: 編輯操作列表
            
        Returns:
            API 回應
        """
        # 確保 Web 服務運行中
        if not self.is_running():
            if not self.start_web_server():
                return {
                    "error": f"無法連接到 Next.js 應用 ({config.nextjs_url})。請確保已執行 'npm run dev'"
                }
        
        try:
            async with httpx.AsyncClient(timeout=config.http_timeout) as client:
                payload: dict[str, Any] = {"action": action, "xml": xml}
                if tab_id:
                    payload["tabId"] = tab_id
                if tab_name:
                    payload["tabName"] = tab_name
                if edits:
                    payload["edits"] = edits
                
                response = await client.post(config.api_mcp_url, json=payload)
                return response.json()
                
        except httpx.ConnectError:
            return {
                "error": f"無法連接到 Next.js 應用 ({config.nextjs_url})。請確保已執行 'npm run dev'"
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def get_tabs(self) -> dict:
        """取得所有分頁"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(config.api_tabs_url)
                if response.status_code == 200:
                    return response.json()
                return {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def tab_action(self, action: str, tab_id: str) -> dict:
        """
        執行分頁操作
        
        Args:
            action: switch 或 close
            tab_id: 分頁 ID
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    config.api_tabs_url,
                    json={"action": action, "id": tab_id}
                )
                if response.status_code == 200:
                    return response.json()
                return {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_diagram_content(self, tab_id: Optional[str] = None) -> dict:
        """
        取得圖表內容
        
        Args:
            tab_id: 分頁 ID，不指定則取得當前活躍分頁
            
        Returns:
            包含 xml, tabId, tabName 的 dict
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{config.api_mcp_url}?action=get"
                if tab_id:
                    url += f"&tabId={tab_id}"
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                return {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}


# 全局客戶端實例
web_client = WebClient()
