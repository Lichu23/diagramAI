import type { FlowGraph } from '../services/groq';

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(graph: FlowGraph): void {
  triggerDownload(JSON.stringify(graph, null, 2), 'diagram.json', 'application/json');
}

export function exportMermaid(graph: FlowGraph): void {
  const lines: string[] = ['flowchart TD'];

  for (const node of graph.nodes) {
    const label = node.label.replace(/"/g, "'");
    if (node.type === 'start' || node.type === 'end') {
      lines.push(`  ${node.id}([${label}])`);
    } else if (node.type === 'condition') {
      lines.push(`  ${node.id}{${label}}`);
    } else {
      lines.push(`  ${node.id}[${label}]`);
    }
  }

  for (const edge of graph.edges) {
    if (edge.label) {
      lines.push(`  ${edge.from} -->|${edge.label}| ${edge.to}`);
    } else {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
  }

  triggerDownload(lines.join('\n'), 'diagram.md', 'text/plain');
}
