import { FlowGraphSchema, type FlowGraph } from '../services/groq';

function base64urlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export async function compressGraph(graph: FlowGraph): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(graph));

  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes as unknown as ArrayBuffer);
    writer.close();
    const buffer = await new Response(cs.readable).arrayBuffer();
    return base64urlEncode(new Uint8Array(buffer));
  }

  return base64urlEncode(bytes);
}

export async function decompressGraph(encoded: string): Promise<FlowGraph> {
  const bytes = base64urlDecode(encoded);

  let json: string;
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes as unknown as ArrayBuffer);
      writer.close();
      const buffer = await new Response(ds.readable).arrayBuffer();
      json = new TextDecoder().decode(buffer);
    } catch {
      // Fallback: data was encoded without compression
      json = new TextDecoder().decode(bytes);
    }
  } else {
    json = new TextDecoder().decode(bytes);
  }

  const parsed = JSON.parse(json);
  return FlowGraphSchema.parse(parsed);
}
