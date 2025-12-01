# Next AI Draw.io

A next.js web application that integrates AI capabilities with draw.io diagrams. This app allows you to create, modify, and enhance diagrams through natural language commands and AI-assisted visualization.

**🆕 Now with GitHub Copilot MCP Integration!** Control diagrams directly from VS Code using GitHub Copilot Agent.

https://github.com/user-attachments/assets/b2eef5f3-b335-4e71-a755-dc2e80931979

Demo site: [https://next-ai-draw-io.vercel.app](https://next-ai-draw-io.vercel.app)

## Features

-   **LLM-Powered Diagram Creation**: Leverage Large Language Models to create and manipulate draw.io diagrams directly through natural language commands
-   **🆕 GitHub Copilot MCP Integration**: Control diagrams directly from VS Code using GitHub Copilot Agent via Model Context Protocol (MCP)
-   **Image-Based Diagram Replication**: Upload existing diagrams or images and have the AI replicate and enhance them automatically
-   **Diagram History**: Comprehensive version control that tracks all changes, allowing you to view and restore previous versions of your diagrams before the AI editing.
-   **Interactive Chat Interface**: Communicate with AI to refine your diagrams in real-time
-   **AWS Architecture Diagram Support**: Specialized support for generating AWS architecture diagrams
-   **Animated Connectors**: Create dynamic and animated connectors between diagram elements for better visualization

## **Examples**

Here are some example prompts and their generated diagrams:

<div align="center">
<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <strong>GCP architecture diagram</strong><br />
      <p><strong>Prompt:</strong> Generate a GCP architecture diagram with **GCP icons**. In this diagram, users connect to a frontend hosted on an instance.</p>
      <img src="./public/gcp_demo.svg" alt="GCP Architecture Diagram" width="480" />
    </td>
    <td width="50%" valign="top">
      <strong>AWS architecture diagram</strong><br />
      <p><strong>Prompt:</strong> Generate a AWS architecture diagram with **AWS icons**. In this diagram, users connect to a frontend hosted on an instance.</p>
      <img src="./public/aws_demo.svg" alt="AWS Architecture Diagram" width="480" />
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>Azure architecture diagram</strong><br />
      <p><strong>Prompt:</strong> Generate a Azure architecture diagram with **Azure icons**. In this diagram, users connect to a frontend hosted on an instance.</p>
      <img src="./public/azure_demo.svg" alt="Azure Architecture Diagram" width="480" />
    </td>
    <td width="50%" valign="top">
      <strong>Animated transformer connectors</strong><br />
      <p><strong>Prompt:</strong> Give me a **animated connector** diagram of transformer's architecture.</p>
      <img src="./public/animated_connectors.svg" alt="Transformer Architecture with Animated Connectors" width="480" />
    </td>
  </tr>
  <tr>
    <td colspan="2" valign="top" align="center">
      <strong>Cat sketch prompt</strong><br />
      <p><strong>Prompt:</strong> Draw a cute cat for me.</p>
      <img src="./public/cat_demo.svg" alt="Cat Drawing" width="260" />
    </td>
  </tr>
</table>
</div>

## How It Works

The application uses the following technologies:

-   **Next.js**: For the frontend framework and routing
-   **@ai-sdk/react**: For the chat interface and AI interactions
-   **react-drawio**: For diagram representation and manipulation

Diagrams are represented as XML that can be rendered in draw.io. The AI processes your commands and generates or modifies this XML accordingly.

## Multi-Provider Support

-   AWS Bedrock (default)
-   OpenAI / OpenAI-compatible APIs (via `OPENAI_BASE_URL`)
-   Anthropic
-   Google AI
-   Azure OpenAI
-   Ollama

Note that `claude-sonnet-4-5` has trained on draw.io diagrams with AWS logos, so if you want to create AWS architecture diagrams, this is the best choice.

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/DayuanJiang/next-ai-draw-io
cd next-ai-draw-io
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Configure your AI provider:

Create a `.env.local` file in the root directory:

```bash
cp env.example .env.local
```

Edit `.env.local` and configure your chosen provider:

-   Set `AI_PROVIDER` to your chosen provider (bedrock, openai, anthropic, google, azure, ollama)
-   Set `AI_MODEL` to the specific model you want to use
-   Add the required API keys for your provider

See the [Multi-Provider Support](#multi-provider-support) section above for provider-specific configuration examples.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## GitHub Copilot MCP Integration

This fork adds support for controlling diagrams directly from VS Code using GitHub Copilot Agent via Model Context Protocol (MCP).

### Prerequisites

- VS Code with GitHub Copilot extension
- Python 3.10+ with `uv` package manager

### Setup MCP Server

1. Install `uv` if not already installed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. The MCP server configuration is in `.vscode/mcp.json`. Update the `uv` path if needed:

```json
{
  "servers": {
    "drawio-mcp-server": {
      "command": "/path/to/uv",
      "args": ["--directory", "${workspaceFolder}/mcp-server", "run", "drawio-mcp-server"]
    }
  }
}
```

3. Start the Next.js development server:

```bash
npm run dev
```

4. In VS Code, open GitHub Copilot Chat and use the MCP tools:

```
@workspace Use the drawio tools to create a flowchart showing user login process
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `create_diagram` | Create a new diagram from description or custom XML |
| `edit_diagram` | Edit an existing diagram |
| `read_diagram` | Read and describe diagram contents |
| `load_file` | Load existing .drawio file into browser editor |
| `save_tab` | Save diagram to .drawio file (smart: asks user if path not specified) |
| `get_diagram_content` | Get diagram XML content |
| `get_user_events` | Query user operations in browser (pull model for privacy) |
| `list_templates` | List available diagram templates |
| `create_from_template` | Create diagram from template |
| `export_diagram` | Export diagram to SVG/PNG/PDF |
| `get_web_status` | Check Draw.io web editor status |
| `start_drawio_web` | Start the Draw.io web editor |
| `list_tabs` | List all open diagram tabs |
| `switch_tab` | Switch to a specific tab |
| `close_tab` | Close a diagram tab |
| `get_drawing_guidelines` | Get drawing best practices (edges, colors, shapes, layout) |
| `get_style_string` | Generate Draw.io style strings |
| `list_available_styles` | List all available styles and colors |

### Drawing Guidelines

The MCP server includes built-in drawing guidelines to ensure professional diagrams:

**Edge Styles (推薦使用正交轉角線):**
- `orthogonal` - Orthogonal edges with rounded corners (recommended)
- `straight` - Direct lines
- `curved` - Curved edges
- `entityRelation` - For ER diagrams

**Color Palette:**
| Color | Fill | Stroke | Usage |
|-------|------|--------|-------|
| Blue | #dae8fc | #6c8ebf | Process steps |
| Green | #d5e8d4 | #82b366 | Start/Success |
| Yellow | #fff2cc | #d6b656 | Decision |
| Orange | #ffe6cc | #d79b00 | Output/Warning |
| Purple | #e1d5e7 | #9673a6 | External system |
| Red | #f8cecc | #b85450 | End/Error |

**Layout Guidelines:**
- Horizontal spacing: 60px
- Vertical spacing: 40px
- Canvas margins: 40px
- Grid size: 20px

### Smart Save Workflow

When user says "save", the agent can:
1. Call `save_tab()` without path → Tool returns prompt asking where to save
2. Agent asks user or auto-detects (project diagram vs casual drawing)
3. Call `save_tab(file_path="...")` with the determined path

### MCP-to-MCP Collaboration

For project-related diagrams, Draw.io MCP can collaborate with other MCPs:

```
┌─────────────────┐                      ┌─────────────────┐
│   Agent         │                      │   Agent         │
│   (Copilot)     │                      │   (Copilot)     │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │ 1. "Save to project"                   │
         ▼                                        │
┌─────────────────┐                               │
│  MDPaper MCP    │ 2. Get project path           │
│  (Research)     │────────────────────►          │
└────────┬────────┘                               │
         │ 3. Return: "./figures/study-flow.drawio"
         ▼                                        │
┌─────────────────┐                               │
│  Draw.io MCP    │◄──────────────────────────────┘
│  save_tab()     │ 4. save_tab(file_path="./figures/...")
└─────────────────┘
```

**Example Flow:**
1. User: "存檔到專案"
2. Agent calls MDPaper MCP → gets project diagram path
3. Agent calls Draw.io MCP → `save_tab(file_path=project_path)`
4. Diagram saved to project directory

### User Event Query (Pull Model)

Draw.io MCP uses a **pull model** for user events to protect privacy:

```
Browser (User actions) → Event Queue (silent) → Agent queries when needed
```

- User operations are NOT automatically sent to AI
- Agent calls `get_user_events()` only when user mentions their actions
- Saves tokens and protects user privacy

### Agent-Generated XML Support

The `create_diagram` tool now supports **direct XML input** from AI agents. This allows agents like GitHub Copilot to generate complex Draw.io diagrams by:

1. Understanding the diagram request
2. Generating Draw.io XML format
3. Sending XML to browser via MCP tool

Example usage with XML parameter:
```
create_diagram(
  description="A horse drawing",
  xml="<root><mxCell id='0'/>...</root>",
  tab_name="My Diagram"
)
```

The tool description includes complete XML format documentation with:
- Shape styles (rectangle, ellipse, rhombus, etc.)
- Color options (blue, green, yellow, orange, purple, red)
- Layout guidelines (x: 0-800, y: 0-600)
- Edge/arrow configurations

### Architecture

```
┌─────────────────┐     MCP Protocol     ┌─────────────────┐
│  GitHub Copilot │◄───────────────────►│  MCP Server     │
│  (VS Code)      │                      │  (Python/FastMCP)│
└─────────────────┘                      └────────┬────────┘
                                                  │ HTTP
                                                  ▼
┌─────────────────┐                      ┌─────────────────┐
│  Browser        │◄─── WebSocket ──────►│  WS Server      │
│  (Draw.io)      │     (Port 6003)      │  (Node.js)      │
└─────────────────┘                      └────────┬────────┘
                                                  │ HTTP (fallback)
                                                  ▼
                                         ┌─────────────────┐
                                         │  Next.js API    │
                                         │  (Port 6002)    │
                                         └─────────────────┘
```

### WebSocket Real-time Communication (New!)

The application now supports WebSocket for real-time bidirectional communication between the browser and server, replacing the previous polling mechanism.

**Benefits:**
- **Instant updates** - No more 2-3 second polling delays
- **Reduced overhead** - No unnecessary HTTP requests
- **Better UX** - Real-time diagram synchronization

**Starting the servers:**

```bash
# Option 1: Start separately
npm run dev:ws   # Start WebSocket server (port 6003/6004)
npm run dev      # Start Next.js (port 6002)

# Option 2: Start together
npm run dev:all
```

**Architecture:**
| Component | Port | Role |
|-----------|------|------|
| Next.js | 6002 | Web UI + API (fallback) |
| WebSocket | 6003 | Browser ↔ Server real-time |
| WS HTTP API | 6004 | MCP → WebSocket forwarding |

**Fallback:** If WebSocket is unavailable, the system automatically falls back to HTTP polling.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Or you can deploy by this button.
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDayuanJiang%2Fnext-ai-draw-io)

Be sure to **set the environment variables** in the Vercel dashboard as you did in your local `.env.local` file.

## Project Structure

```
app/                  # Next.js application routes and pages
  api/mcp/            # MCP communication API endpoint
  extract_xml.ts      # Utilities for XML processing
components/           # React components
  chat-input.tsx      # User input component for AI interaction
  chatPanel.tsx       # Chat interface with diagram control
  ui/                 # UI components (buttons, cards, etc.)
contexts/             # React contexts
  diagram-context.tsx # Diagram state + WebSocket integration
lib/                  # Utility functions and helpers
  utils.ts            # General utilities including XML conversion
  use-mcp-polling.ts  # React hook for MCP polling (fallback)
  websocket/          # WebSocket module
    types.ts          # Message type definitions
    server.ts         # Server-side WebSocket manager
    useWebSocket.ts   # React hook for client connection
scripts/              # Utility scripts
  ws-server.ts        # Standalone WebSocket server
  start-dev.sh        # Smart dev server startup
mcp-server/           # Python MCP Server for GitHub Copilot integration
  src/drawio_mcp_server/
    server.py         # MCP tools definition
    diagram_generator.py  # Draw.io XML generation
    templates.py      # Diagram templates (AWS, GCP, Azure, etc.)
    tools/            # MCP tool modules
      diff_tools.py   # Incremental editing tools
public/               # Static assets including example images
.vscode/
  mcp.json            # MCP server configuration
```

## TODOs

-   [x] Allow the LLM to modify the XML instead of generating it from scratch everytime.
-   [x] Improve the smoothness of shape streaming updates.
-   [x] Add multiple AI provider support (OpenAI, Anthropic, Google, Azure, Ollama)
-   [x] Add GitHub Copilot MCP integration for VS Code control
-   [x] Support agent-generated XML in MCP tools (2024-11-28)
-   [x] Fix MCP server blocking issue during Web service startup (2024-11-28)
-   [x] Add smart save workflow with user path query (2024-11-28)
-   [x] Add user event query system (pull model for privacy) (2024-11-28)
-   [x] Browser save button triggers file download (2024-11-28)
-   [x] Add load_file tool for opening existing .drawio files (2024-11-28)
-   [x] Add debug logging system for frontend-to-backend error reporting (2024-11-28)
-   [x] Add drawing guidelines tools (edges, colors, shapes, layout) (2024-11-29)
-   [x] Add incremental editing system (diff-based XML editing) (2024-12-01)
-   [x] Add WebSocket for real-time communication (2024-12-01)
-   [ ] MCP-to-MCP collaboration for project diagram management
-   [ ] Solve the bug that generation will fail for session that longer than 60s.

## License

This project is licensed under the MIT License.

## Support & Contact

For support or inquiries, please open an issue on the GitHub repository or contact the maintainer at:

-   Email: me[at]jiang.jp

---
