import {AssistantMessage, RouteId} from '../domain/types';

export interface QuickEstimateResponse {
  model: string;
  estimate: {
    routeId: RouteId;
    origin: string;
    destination: string;
    estimatedProductCost: number;
    suggestedFee: number;
    tip: string;
  };
}

export interface GeneratedImageResponse {
  model: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio: '4:3' | '1:1' | '16:9';
  imageUrl: string;
  caption: string;
}

export async function requestQuickEstimate(
  description: string,
  routeId?: RouteId,
): Promise<QuickEstimateResponse> {
  const res = await fetch('/api/ai/quick-estimate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({description, routeId}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo obtener una estimación rápida.');
  }
  return data as QuickEstimateResponse;
}

export async function sendAssistantMessage(params: {
  message: string;
  history: AssistantMessage[];
  mode: 'balanced' | 'fast';
}): Promise<{model: string; reply: string}> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      message: params.message,
      mode: params.mode,
      history: params.history.map((m) => ({role: m.role, text: m.text})),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo conectar con el asistente.');
  }
  return data as {model: string; reply: string};
}

export async function generateProductPhoto(params: {
  prompt: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio?: '4:3' | '1:1' | '16:9';
}): Promise<GeneratedImageResponse> {
  const res = await fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      prompt: params.prompt,
      imageSize: params.imageSize,
      aspectRatio: params.aspectRatio ?? '4:3',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo generar la fotografía de producto.');
  }
  return data as GeneratedImageResponse;
}
