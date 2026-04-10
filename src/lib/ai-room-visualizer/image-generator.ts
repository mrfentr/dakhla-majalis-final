/**
 * AI Room Visualizer - Image Generator
 *
 * Generates room visualization images using AI image models.
 * Supports multiple providers: Replicate (Flux), OpenAI (DALL-E), etc.
 */

import {
  ImageProvider,
  ImageGenerationConfig,
  ImageGenerationResult,
} from './types';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: ImageGenerationConfig = {
  provider: 'replicate',
  model: 'ideogram-ai/ideogram-v3-turbo', // Best for text/labels and precise diagrams
  width: 1024,
  height: 1024,
  quality: 'standard',
};

// ============================================
// REPLICATE PROVIDER
// ============================================

async function generateWithReplicate(
  prompt: string,
  config: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return {
      success: false,
      generationTimeMs: 0,
      provider: 'replicate',
      model: config.model || 'flux-schnell',
      error: 'REPLICATE_API_TOKEN not set in environment',
    };
  }

  const startTime = Date.now();
  const model = config.model || 'black-forest-labs/flux-schnell';

  try {
    console.log(`[Image-Generator] Calling Replicate with model: ${model}`);

    const version = getReplicateVersion(model);

    // Use models API endpoint for official models (no version needed)
    const apiUrl = version
      ? 'https://api.replicate.com/v1/predictions'
      : `https://api.replicate.com/v1/models/${model}/predictions`;

    const requestBody = version
      ? {
          version: version,
          input: {
            prompt: prompt,
            width: config.width || 1024,
            height: config.height || 1024,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: model.includes('schnell') ? 4 : 28,
          },
        }
      : {
          input: {
            prompt: prompt,
            width: config.width || 1024,
            height: config.height || 1024,
            num_outputs: 1,
          },
        };

    // Create prediction
    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // Wait for result
      },
      body: JSON.stringify(requestBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    let prediction = await createResponse.json();

    // Poll for completion if not using 'wait' or if still processing
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(prediction.urls.get, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
      prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }

    const imageUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    const endTime = Date.now();
    console.log(`[Image-Generator] Replicate completed in ${endTime - startTime}ms`);

    return {
      success: true,
      imageUrl,
      generationTimeMs: endTime - startTime,
      provider: 'replicate',
      model,
    };
  } catch (error) {
    const endTime = Date.now();
    console.error('[Image-Generator] Replicate error:', error);

    return {
      success: false,
      generationTimeMs: endTime - startTime,
      provider: 'replicate',
      model,
      error: (error as Error).message,
    };
  }
}

function getReplicateVersion(model: string): string | null {
  // Map model names to their Replicate versions
  // Return null to use the latest version via the models API
  const versions: Record<string, string | null> = {
    'black-forest-labs/flux-schnell': null, // Use latest
    'black-forest-labs/flux-dev': null, // Use latest
    'black-forest-labs/flux-pro': null, // Use latest
    'prunaai/flux-fast': null, // Use latest
    'stability-ai/sdxl': null, // Use latest
    'ideogram-ai/ideogram-v3-turbo': null, // Use latest - best for text/labels
  };
  return versions[model] !== undefined ? versions[model] : null;
}

// ============================================
// OPENAI PROVIDER (DALL-E)
// ============================================

async function generateWithOpenAI(
  prompt: string,
  config: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      generationTimeMs: 0,
      provider: 'dalle',
      model: 'dall-e-3',
      error: 'OPENAI_API_KEY not set in environment',
    };
  }

  const startTime = Date.now();

  try {
    console.log('[Image-Generator] Calling OpenAI DALL-E 3');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: `${config.width || 1024}x${config.height || 1024}`,
        quality: config.quality || 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL in OpenAI response');
    }

    const endTime = Date.now();
    console.log(`[Image-Generator] OpenAI completed in ${endTime - startTime}ms`);

    return {
      success: true,
      imageUrl,
      generationTimeMs: endTime - startTime,
      provider: 'dalle',
      model: 'dall-e-3',
    };
  } catch (error) {
    const endTime = Date.now();
    console.error('[Image-Generator] OpenAI error:', error);

    return {
      success: false,
      generationTimeMs: endTime - startTime,
      provider: 'dalle',
      model: 'dall-e-3',
      error: (error as Error).message,
    };
  }
}

// ============================================
// IDEOGRAM PROVIDER (Best for text labels)
// ============================================

async function generateWithIdeogram(
  prompt: string,
  config: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      generationTimeMs: 0,
      provider: 'ideogram',
      model: 'ideogram-v2',
      error: 'IDEOGRAM_API_KEY not set in environment',
    };
  }

  const startTime = Date.now();

  try {
    console.log('[Image-Generator] Calling Ideogram');

    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt: prompt,
          model: 'V_2',
          magic_prompt_option: 'AUTO',
          aspect_ratio: 'ASPECT_1_1',
          style_type: 'REALISTIC',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ideogram API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL in Ideogram response');
    }

    const endTime = Date.now();
    console.log(`[Image-Generator] Ideogram completed in ${endTime - startTime}ms`);

    return {
      success: true,
      imageUrl,
      generationTimeMs: endTime - startTime,
      provider: 'ideogram',
      model: 'ideogram-v2',
    };
  } catch (error) {
    const endTime = Date.now();
    console.error('[Image-Generator] Ideogram error:', error);

    return {
      success: false,
      generationTimeMs: endTime - startTime,
      provider: 'ideogram',
      model: 'ideogram-v2',
      error: (error as Error).message,
    };
  }
}

// ============================================
// MAIN GENERATE FUNCTION
// ============================================

export async function generateImage(
  prompt: string,
  config: Partial<ImageGenerationConfig> = {}
): Promise<ImageGenerationResult> {
  const fullConfig: ImageGenerationConfig = { ...DEFAULT_CONFIG, ...config };

  console.log(`[Image-Generator] Generating image with provider: ${fullConfig.provider}`);
  console.log(`[Image-Generator] Prompt length: ${prompt.length} chars`);

  switch (fullConfig.provider) {
    case 'replicate':
      return generateWithReplicate(prompt, fullConfig);

    case 'dalle':
      return generateWithOpenAI(prompt, fullConfig);

    case 'ideogram':
      return generateWithIdeogram(prompt, fullConfig);

    default:
      return {
        success: false,
        generationTimeMs: 0,
        provider: fullConfig.provider,
        model: 'unknown',
        error: `Unknown provider: ${fullConfig.provider}`,
      };
  }
}

// ============================================
// PROVIDER AVAILABILITY CHECK
// ============================================

export function getAvailableProviders(): ImageProvider[] {
  const available: ImageProvider[] = [];

  if (process.env.REPLICATE_API_TOKEN) {
    available.push('replicate');
  }
  if (process.env.OPENAI_API_KEY) {
    available.push('dalle');
  }
  if (process.env.IDEOGRAM_API_KEY) {
    available.push('ideogram');
  }

  return available;
}

export function getBestAvailableProvider(): ImageProvider | null {
  // Priority: Ideogram (best text) > Replicate (fast) > DALL-E (quality)
  if (process.env.IDEOGRAM_API_KEY) return 'ideogram';
  if (process.env.REPLICATE_API_TOKEN) return 'replicate';
  if (process.env.OPENAI_API_KEY) return 'dalle';
  return null;
}
