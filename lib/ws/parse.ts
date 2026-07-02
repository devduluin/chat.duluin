import type { WsResponse } from "./types";

export async function parseWsMessageData(data: unknown): Promise<string> {
  if (data instanceof Blob) {
    console.log("🌍📨 [BLOB] Converting Blob to text...");
    const jsonData = await data.text();
    console.log("🌍📨 [BLOB] Converted text:", jsonData.substring(0, 200));
    return jsonData;
  }
  return data as string;
}

export function parseWsResponse(jsonData: string): WsResponse {
  if (typeof jsonData === "string" && jsonData.includes("message_deleted")) {
    console.log("🔥🔥🔥 DELETE MESSAGE IN RAW DATA!");
  }

  return JSON.parse(jsonData) as WsResponse;
}
