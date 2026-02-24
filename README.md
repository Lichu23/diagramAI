# AI Flow Creator

**AI Flow Creator** is a web app that turns a plain-language description of any process into an interactive visual flowchart — instantly.

> Describe a process → AI generates the diagram → explore, edit, and share it.

---

## How to use it

### 1. Describe your process
Type a description of any process in the text area at the top. Be as natural as you like:

> *"A customer submits an order. The system checks if the item is in stock. If yes, the payment is processed and the order is shipped. If no, the customer is notified."*

Or click one of the **suggestion chips** (User login, Order processing, CI/CD pipeline…) to load a ready-made example and generate it immediately.

### 2. Generate the diagram
Click **Generate Diagram** or press `Ctrl+Enter`. The AI parses your description and renders a flowchart with the correct node types and connections.

### 3. Interact with the diagram
- **Drag** nodes to rearrange the layout freely.
- **Double-click** a node label to rename it inline.
- **Scroll** to zoom in/out; drag the canvas background to pan.
- Switch between **vertical** and **horizontal** layout with the toolbar button.

---

## Features

### Prompt suggestions
Six pre-written example flows appear as clickable chips. Clicking one fills the prompt and generates the diagram in one step.

### Undo / Redo
Every generation, clear, label edit, and history load is undoable.
- `Ctrl+Z` — undo
- `Ctrl+Shift+Z` — redo
- Toolbar **Undo / Redo** buttons (disabled when there is nothing to undo/redo)

### Save & History
Click **Save** to store the current diagram locally. Open **History** to browse saved diagrams, rename them, or reload any previous one.

### Simulation
Click **Simulate** to replay the flow step by step, watching each node and edge activate in sequence. Pause, resume, or stop at any time.

### Export
Click **Export** in the toolbar to download the diagram in two formats:
- **JSON** — the raw graph structure (`diagram.json`), useful for programmatic use or re-importing.
- **Mermaid (.md)** — a `flowchart TD` Mermaid diagram (`diagram.md`), ready to paste into GitHub, Notion, or any Mermaid-compatible renderer.

### Share via URL
Click **Copy Link** to compress the current diagram into the URL and copy it to your clipboard. Anyone who opens that link will see your diagram loaded automatically — no account needed.

---

## Node types

| Type | Shape | Meaning |
|---|---|---|
| Start | Green pill | Entry point of the flow |
| End | Red pill | Terminal point (there can be multiple) |
| Action | Blue rectangle | A concrete step or task |
| Condition | Yellow diamond | A yes/no decision — always has two branches |

---

## Tech stack

React · Vite · TypeScript · React Flow · Tailwind CSS · Groq API (llama-3.3-70b-versatile)
