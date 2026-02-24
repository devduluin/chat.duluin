// services/nlpService.ts
import { v4 as uuidv4 } from "uuid";

const NLP_SERVICE_URL =
  process.env.NEXT_PUBLIC_NLP_SERVICE_URL || "http://localhost:5000";

export interface NLPRequest {
  text: string;
  user_id: string;
}

export interface NLPResponse {
  success: boolean;
  intent: string;
  message: string;
  data?: any;
  state?: string;
}

/**
 * Send message to NLP Service chatbot
 */
export async function sendToNLP(
  text: string,
  userId: string,
  authorization?: string
): Promise<NLPResponse> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers["Authorization"] = authorization;
    }

    const response = await fetch(`${NLP_SERVICE_URL}/process`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        text,
        user_id: userId,
      } as NLPRequest),
    });

    if (!response.ok) {
      throw new Error(`NLP Service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send message to NLP Service:", error);
    throw error;
  }
}

/**
 * Check NLP Service health
 */
export async function checkNLPHealth(): Promise<boolean> {
  try {
    // Note: NLP service might not have a dedicated /health endpoint, 
    // but we can check if the service is reachable via gateway
    const response = await fetch(`${NLP_SERVICE_URL.replace('/process', '')}`, {
      method: "GET",
    });
    return response.ok || response.status === 404; // 404 means reachable but route not found
  } catch (error) {
    console.error("NLP Service health check failed:", error);
    return false;
  }
}
