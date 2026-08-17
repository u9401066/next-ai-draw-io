import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { Client, InMemoryTransport } from "@modelcontextprotocol/client"
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { createServer } from "../dist/index.js"

const MODERN_PROTOCOL_VERSION = "2026-07-28"
const EXPECTED_TOOLS = [
    "create_new_diagram",
    "edit_diagram",
    "export_diagram",
    "get_diagram",
    "start_session",
]

function createModernClient(name) {
    return new Client(
        { name, version: "1.0.0" },
        {
            versionNegotiation: {
                mode: { pin: MODERN_PROTOCOL_VERSION },
            },
        },
    )
}

async function assertModernSurface(client, label) {
    assert.equal(client.getProtocolEra(), "modern", `${label}: protocol era`)
    assert.equal(
        client.getNegotiatedProtocolVersion(),
        MODERN_PROTOCOL_VERSION,
        `${label}: protocol version`,
    )

    const { tools } = await client.listTools()
    assert.deepEqual(
        tools.map(({ name }) => name).sort(),
        EXPECTED_TOOLS,
        `${label}: tool surface`,
    )

    const { prompts } = await client.listPrompts()
    assert.deepEqual(
        prompts.map(({ name }) => name),
        ["diagram-workflow"],
        `${label}: prompt surface`,
    )

    const result = await client.callTool({ name: "get_diagram", arguments: {} })
    assert.equal(result.isError, true, `${label}: safe tool call`)
}

async function runDirectSmoke() {
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair()
    const handle = serveStdio(createServer, {
        legacy: "reject",
        transport: serverTransport,
    })
    const client = createModernClient("drawio-direct-sdk2-smoke")

    try {
        await client.connect(clientTransport)
        await assertModernSurface(client, "direct")
    } finally {
        await client.close()
        await handle.close()
    }
}

async function runSubprocessSmoke() {
    const serverPath = fileURLToPath(
        new URL("../dist/index.js", import.meta.url),
    )
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
    })
    const client = createModernClient("drawio-stdio-sdk2-smoke")

    try {
        await client.connect(transport)
        await assertModernSurface(client, "stdio subprocess")
    } finally {
        await client.close()
    }
}

await runDirectSmoke()
await runSubprocessSmoke()
console.log("MCP TypeScript SDK 2 direct and stdio smokes passed (2026-07-28)")
