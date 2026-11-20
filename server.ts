import 'dotenv/config';
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI, Type} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): {status: number; message: string} {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw === 'MISSING_API_KEY' || raw.includes('API_KEY_INVALID') || raw.includes('403') || raw.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message:
        'No se pudo autenticar con Gemini. Verifica o selecciona tu clave de API en el panel Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Límite de cuota alcanzado. Si usas un modelo de pago, selecciona una clave con facturación activa en Settings > Secrets.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: 'El modelo solicitado no está disponible actualmente. Intenta de nuevo en unos momentos.',
    };
  }
  return {
    status: 500,
    message: 'Ocurrió un error al consultar el servicio de inteligencia artificial. Intenta nuevamente.',
  };
}

const DEPASO_SYSTEM_INSTRUCTION = `Eres el Asistente Oficial de DePaso, una PWA de crowdshipping P2P para una comunidad universitaria en Ecuador.
Tu rol es ayudar a estudiantes (compradores y repartidores ocasionales) con respuestas claras, breves, prácticas y seguras en español de Ecuador.

Reglas oficiales de DePaso que siempre debes respetar:
1. Rutas fijas y tarifas sugeridas en USD ($):
   - Multis ↔ Bloques: comida rápida, encebollado, bolón, café dentro del campus. Tarifa sugerida: $0.25 – $0.50. Pago: contra entrega (Efectivo o Deuna).
   - Urcuquí ↔ Campus: farmacia, comida, papelería, víveres (~15 min en bus). Tarifa sugerida: $0.50 – $1.00. Pago: contra entrega si ≤ $6; pago en dos tiempos si > $6.
   - Ibarra ↔ Campus: supermercado, compras específicas (viajeros diarios). Tarifa sugerida: $1.00 – $2.50. Pago: en dos tiempos con foto de producto/factura.
   - Quito ↔ Campus: encomiendas familiares, paquetes de fin de semana. Tarifa sugerida: $3.00 – $6.00. Pago: solo tarifa de envío contra entrega + verificación obligatoria de paquete abierto.
2. Pagos 100% P2P sin escrow: DePaso no custodia ni toca el dinero. Todo es directo vía Deuna (Banco Pichincha) o efectivo.
3. Seguridad y niveles de confianza:
   - Nivel 1 (Nivelación / cuenta nueva): límite sugerido de hasta $6 en encargos.
   - Nivel 2 (3+ entregas exitosas sin reportes): desbloquea compras > $6 y rutas Ibarra/Quito.
   - Prohibido sustancias ilícitas; mayoría de edad (+18) para alcohol; nunca transportar paquetes sellados sin revisar su contenido.
   - Entrega verificada con botón "Ya llegué" (reloj de cortesía de 5 min) y PIN presencial de 4 dígitos.
   - Una vez que el pedido pasa a "Comprado" o "En camino", el comprador no puede cancelar unilateralmente.
4. Estilo de respuesta: conciso (máximo 120 palabras), estructurado con pasos claros, tono cercano y profesional.`;

async function startServer() {
  const app = express();
  app.use(express.json({limit: '4mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok', service: 'depaso-api'});
  });

  // 1. Low-latency route & tariff estimator using gemini-3.1-flash-lite
  app.post('/api/ai/quick-estimate', async (req, res) => {
    try {
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      const routeHint = typeof req.body?.routeId === 'string' ? req.body.routeId : '';

      if (!description || description.length < 3 || description.length > 300) {
        res.status(400).json({error: 'Describe tu encargo (entre 3 y 300 caracteres).'});
        return;
      }

      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Analiza este encargo universitario en Ecuador y sugiere la mejor ruta fija, costo estimado del producto en USD, tarifa justa de envío en USD, punto de origen, punto de destino y un consejo breve de pago P2P.
Encargo: "${description}"
Ruta preseleccionada (opcional): "${routeHint}"`,
        config: {
          systemInstruction:
            'Responde únicamente JSON válido siguiendo el esquema. Rutas válidas: "multis-bloques", "urcuqui-campus", "ibarra-campus", "quito-campus". Precios realistas de Ecuador en USD.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routeId: {
                type: Type.STRING,
                description: 'Uno de: multis-bloques, urcuqui-campus, ibarra-campus, quito-campus',
              },
              origin: {type: Type.STRING, description: 'Origen concreto corto, ej. Comedores Multis o Farmacia Cruz Azul Urcuquí'},
              destination: {type: Type.STRING, description: 'Destino concreto corto, ej. Bloques Académicos B2 o Residencias'},
              estimatedProductCost: {type: Type.NUMBER, description: 'Costo estimado del producto en USD (0 si es encomienda familiar)'},
              suggestedFee: {type: Type.NUMBER, description: 'Tarifa justa de envío en USD acorde a la ruta'},
              tip: {type: Type.STRING, description: 'Consejo corto en español (máximo 14 palabras) sobre pago Deuna o entrega'},
            },
            required: ['routeId', 'origin', 'destination', 'estimatedProductCost', 'suggestedFee', 'tip'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        model: 'gemini-3.1-flash-lite',
        estimate: parsed,
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({error: mapped.message});
    }
  });

  // 2. Multi-turn Gemini Chatbot (gemini-4-hydrogen for general reasoning, gemini-3.1-flash-lite for fast mode)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const mode = req.body?.mode === 'fast' ? 'fast' : 'balanced';
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];

      if (!message || message.length > 1000) {
        res.status(400).json({error: 'Escribe una consulta válida (máximo 1000 caracteres).'});
        return;
      }

      const history = rawHistory
        .filter(
          (item: unknown): item is {role: 'user' | 'model'; text: string} =>
            typeof item === 'object' &&
            item !== null &&
            ((item as {role?: string}).role === 'user' || (item as {role?: string}).role === 'model') &&
            typeof (item as {text?: string}).text === 'string' &&
            (item as {text: string}).text.trim().length > 0,
        )
        .slice(-16)
        .map((item: {role: 'user' | 'model'; text: string}) => ({
          role: item.role,
          parts: [{text: item.text}],
        }));

      const model = mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const ai = createGeminiClient();
      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction: DEPASO_SYSTEM_INSTRUCTION,
        },
      });

      const response = await chat.sendMessage({message});
      res.json({
        model,
        reply: response.text ?? 'No pude generar una respuesta en este momento.',
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({error: mapped.message});
    }
  });

  // 3. High-quality product image generation using gemini-3-pro-image-preview with 1K, 2K, 4K resolution selector
  app.post('/api/ai/generate-image', async (req, res) => {
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      const imageSize =
        req.body?.imageSize === '2K' || req.body?.imageSize === '4K' ? req.body.imageSize : '1K';
      const aspectRatio =
        req.body?.aspectRatio === '1:1' || req.body?.aspectRatio === '16:9' ? req.body.aspectRatio : '4:3';

      if (!prompt || prompt.length < 3 || prompt.length > 400) {
        res.status(400).json({error: 'Describe el producto que deseas fotografiar (entre 3 y 400 caracteres).'});
        return;
      }

      const ai = createGeminiClient();
      const studioPrompt = `Fotografía comercial minimalista de producto en luz natural suave sobre superficie de piedra clara neutra, enfoque nítido, sin texto ni marcas de agua, ideal para catálogo universitario "Aquí Ya": ${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{text: studioPrompt}],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({error: 'El modelo no devolvió una imagen. Intenta con otra descripción.'});
        return;
      }

      res.json({
        model: 'gemini-3-pro-image-preview',
        imageSize,
        aspectRatio,
        imageUrl,
        caption: caption.trim(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({error: mapped.message});
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DePaso server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DePaso server:', err);
  process.exit(1);
});
