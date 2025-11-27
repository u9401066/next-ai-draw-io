"""
圖表模板 - 提供預設的 Draw.io 圖表模板
"""


class DiagramTemplates:
    """圖表模板管理器"""
    
    TEMPLATES = {
        # AWS 模板
        "aws-3tier": {
            "name": "AWS 三層架構",
            "description": "經典的 Web/App/DB 三層架構",
            "category": "cloud",
        },
        "aws-serverless": {
            "name": "AWS Serverless",
            "description": "使用 Lambda、API Gateway、DynamoDB 的無伺服器架構",
            "category": "cloud",
        },
        "aws-microservices": {
            "name": "AWS 微服務",
            "description": "使用 ECS/EKS 的微服務架構",
            "category": "cloud",
        },
        
        # GCP 模板
        "gcp-basic": {
            "name": "GCP 基礎架構",
            "description": "Compute Engine + Cloud SQL 基礎架構",
            "category": "cloud",
        },
        "gcp-kubernetes": {
            "name": "GCP Kubernetes",
            "description": "GKE 容器化架構",
            "category": "cloud",
        },
        
        # Azure 模板
        "azure-webapp": {
            "name": "Azure Web App",
            "description": "App Service + SQL Database 架構",
            "category": "cloud",
        },
        "azure-functions": {
            "name": "Azure Functions",
            "description": "無伺服器架構",
            "category": "cloud",
        },
        
        # 流程圖模板
        "flowchart-basic": {
            "name": "基礎流程圖",
            "description": "簡單的開始-處理-結束流程",
            "category": "flowchart",
        },
        "flowchart-decision": {
            "name": "決策流程圖",
            "description": "包含決策分支的流程圖",
            "category": "flowchart",
        },
        
        # 其他模板
        "mindmap-basic": {
            "name": "基礎心智圖",
            "description": "中心主題加四個分支",
            "category": "mindmap",
        },
        "sequence-basic": {
            "name": "基礎序列圖",
            "description": "用戶-系統-資料庫互動",
            "category": "sequence",
        },
        "er-basic": {
            "name": "基礎 ER 圖",
            "description": "用戶-訂單-商品關係圖",
            "category": "er",
        },
    }
    
    def list_templates(self) -> str:
        """列出所有可用模板"""
        result = []
        
        # 按類別分組
        categories = {}
        for template_id, info in self.TEMPLATES.items():
            category = info["category"]
            if category not in categories:
                categories[category] = []
            categories[category].append((template_id, info))
        
        category_names = {
            "cloud": "☁️ 雲端架構",
            "flowchart": "📊 流程圖",
            "mindmap": "🧠 心智圖",
            "sequence": "📋 序列圖",
            "er": "🗃️ ER 圖",
        }
        
        for category, templates in categories.items():
            result.append(f"\n{category_names.get(category, category)}")
            result.append("-" * 30)
            for template_id, info in templates:
                result.append(f"  • {template_id}")
                result.append(f"    {info['name']}: {info['description']}")
        
        return "\n".join(result)
    
    def get_template(self, template_name: str) -> str:
        """獲取指定模板的 XML"""
        if template_name not in self.TEMPLATES:
            raise ValueError(f"未知的模板: {template_name}")
        
        # 根據模板名稱返回對應的 XML
        template_generators = {
            "aws-3tier": self._aws_3tier,
            "aws-serverless": self._aws_serverless,
            "aws-microservices": self._aws_microservices,
            "gcp-basic": self._gcp_basic,
            "gcp-kubernetes": self._gcp_kubernetes,
            "azure-webapp": self._azure_webapp,
            "azure-functions": self._azure_functions,
            "flowchart-basic": self._flowchart_basic,
            "flowchart-decision": self._flowchart_decision,
            "mindmap-basic": self._mindmap_basic,
            "sequence-basic": self._sequence_basic,
            "er-basic": self._er_basic,
        }
        
        generator = template_generators.get(template_name)
        if generator:
            return generator()
        
        raise ValueError(f"模板 {template_name} 尚未實現")
    
    def _aws_3tier(self) -> str:
        """AWS 三層架構模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <!-- AWS Cloud -->
  <mxCell id="2" value="AWS Cloud" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="620" height="400" as="geometry"/>
  </mxCell>
  <!-- Users -->
  <mxCell id="3" value="Users" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#232F3D;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.users;" vertex="1" parent="1">
    <mxGeometry x="320" y="-40" width="78" height="78" as="geometry"/>
  </mxCell>
  <!-- ALB -->
  <mxCell id="4" value="Application&lt;br&gt;Load Balancer" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#8C4FFF;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.application_load_balancer;" vertex="1" parent="1">
    <mxGeometry x="320" y="80" width="78" height="78" as="geometry"/>
  </mxCell>
  <!-- Web Tier -->
  <mxCell id="5" value="Web Server" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;" vertex="1" parent="1">
    <mxGeometry x="160" y="200" width="78" height="78" as="geometry"/>
  </mxCell>
  <mxCell id="6" value="Web Server" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;" vertex="1" parent="1">
    <mxGeometry x="480" y="200" width="78" height="78" as="geometry"/>
  </mxCell>
  <!-- Database -->
  <mxCell id="7" value="RDS MySQL" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#C925D1;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;" vertex="1" parent="1">
    <mxGeometry x="320" y="340" width="78" height="78" as="geometry"/>
  </mxCell>
</root>'''
    
    def _aws_serverless(self) -> str:
        """AWS Serverless 模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="AWS Cloud" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="560" height="280" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="API Gateway" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#E7157B;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.api_gateway;" vertex="1" parent="1">
    <mxGeometry x="100" y="140" width="78" height="78" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="Lambda" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#ED7100;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.lambda_function;" vertex="1" parent="1">
    <mxGeometry x="280" y="140" width="78" height="78" as="geometry"/>
  </mxCell>
  <mxCell id="5" value="DynamoDB" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#C925D1;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.dynamodb;" vertex="1" parent="1">
    <mxGeometry x="460" y="140" width="78" height="78" as="geometry"/>
  </mxCell>
</root>'''
    
    def _aws_microservices(self) -> str:
        """AWS 微服務模板"""
        return self._aws_serverless()  # 簡化，使用相同模板
    
    def _gcp_basic(self) -> str:
        """GCP 基礎架構模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="Google Cloud Platform" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#4285F4;strokeColor=#1A73E8;fontColor=#ffffff;fontSize=14;fontStyle=1;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="520" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="Compute Engine" style="sketch=0;html=1;fillColor=#4285F4;strokeColor=none;verticalAlign=top;verticalLabelPosition=bottom;align=center;shape=mxgraph.gcp2.compute_engine;" vertex="1" parent="1">
    <mxGeometry x="160" y="140" width="78" height="78" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="Cloud SQL" style="sketch=0;html=1;fillColor=#4285F4;strokeColor=none;verticalAlign=top;verticalLabelPosition=bottom;align=center;shape=mxgraph.gcp2.cloud_sql;" vertex="1" parent="1">
    <mxGeometry x="360" y="140" width="78" height="78" as="geometry"/>
  </mxCell>
</root>'''
    
    def _gcp_kubernetes(self) -> str:
        """GCP Kubernetes 模板"""
        return self._gcp_basic()
    
    def _azure_webapp(self) -> str:
        """Azure Web App 模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="Microsoft Azure" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0078D4;strokeColor=#0063B1;fontColor=#ffffff;fontSize=14;fontStyle=1;" vertex="1" parent="1">
    <mxGeometry x="40" y="40" width="520" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="App Service" style="aspect=fixed;html=1;points=[];align=center;image;fontSize=12;image=img/lib/azure2/app_services/App_Services.svg;" vertex="1" parent="1">
    <mxGeometry x="160" y="140" width="64" height="64" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="SQL Database" style="aspect=fixed;html=1;points=[];align=center;image;fontSize=12;image=img/lib/azure2/databases/SQL_Database.svg;" vertex="1" parent="1">
    <mxGeometry x="360" y="140" width="64" height="64" as="geometry"/>
  </mxCell>
</root>'''
    
    def _azure_functions(self) -> str:
        """Azure Functions 模板"""
        return self._azure_webapp()
    
    def _flowchart_basic(self) -> str:
        """基礎流程圖模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;" vertex="1" parent="1">
    <mxGeometry x="260" y="40" width="80" height="50" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="處理步驟 1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
    <mxGeometry x="240" y="130" width="120" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="處理步驟 2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;" vertex="1" parent="1">
    <mxGeometry x="240" y="230" width="120" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="5" value="結束" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=14;" vertex="1" parent="1">
    <mxGeometry x="260" y="330" width="80" height="50" as="geometry"/>
  </mxCell>
  <mxCell id="6" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="2" target="3">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
  <mxCell id="7" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="3" target="4">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
  <mxCell id="8" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="4" target="5">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
</root>'''
    
    def _flowchart_decision(self) -> str:
        """決策流程圖模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
    <mxGeometry x="260" y="40" width="80" height="50" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="條件判斷?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
    <mxGeometry x="240" y="130" width="120" height="80" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="是 - 執行 A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="100" y="260" width="100" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="5" value="否 - 執行 B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1">
    <mxGeometry x="400" y="260" width="100" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="6" value="結束" style="ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;" vertex="1" parent="1">
    <mxGeometry x="260" y="380" width="80" height="50" as="geometry"/>
  </mxCell>
</root>'''
    
    def _mindmap_basic(self) -> str:
        """基礎心智圖模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="主題" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=18;fontStyle=1;" vertex="1" parent="1">
    <mxGeometry x="240" y="180" width="120" height="80" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="想法 1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="80" y="80" width="100" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="想法 2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
    <mxGeometry x="420" y="80" width="100" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="5" value="想法 3" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1">
    <mxGeometry x="80" y="320" width="100" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="6" value="想法 4" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;" vertex="1" parent="1">
    <mxGeometry x="420" y="320" width="100" height="40" as="geometry"/>
  </mxCell>
</root>'''
    
    def _sequence_basic(self) -> str:
        """基礎序列圖模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="用戶" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;" vertex="1" parent="1">
    <mxGeometry x="100" y="40" width="30" height="60" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="系統" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="260" y="50" width="80" height="40" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="資料庫" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;" vertex="1" parent="1">
    <mxGeometry x="420" y="40" width="60" height="60" as="geometry"/>
  </mxCell>
</root>'''
    
    def _er_basic(self) -> str:
        """基礎 ER 圖模板"""
        return '''<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="2" value="User" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="80" y="80" width="140" height="104" as="geometry"/>
  </mxCell>
  <mxCell id="3" value="id: int (PK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontStyle=4;" vertex="1" parent="2">
    <mxGeometry y="26" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="4" value="name: varchar" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="2">
    <mxGeometry y="52" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="5" value="email: varchar" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="2">
    <mxGeometry y="78" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="6" value="Order" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
    <mxGeometry x="320" y="80" width="140" height="130" as="geometry"/>
  </mxCell>
  <mxCell id="7" value="id: int (PK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontStyle=4;" vertex="1" parent="6">
    <mxGeometry y="26" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="8" value="user_id: int (FK)" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="6">
    <mxGeometry y="52" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="9" value="total: decimal" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="6">
    <mxGeometry y="78" width="140" height="26" as="geometry"/>
  </mxCell>
  <mxCell id="10" value="created_at: datetime" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="6">
    <mxGeometry y="104" width="140" height="26" as="geometry"/>
  </mxCell>
</root>'''
