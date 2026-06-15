// src/lib/ai/image.ts

const APIMART_API_KEY = process.env.APIMART_API_KEY || ''
const APIMART_API_URL = process.env.APIMART_API_URL || 'https://api.apimart.ai'
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''

export type ImageModel = 'gpt-image-2' | 'doubao-seedream-5-0-lite' | 'minimax-image-01'

export interface ImageGenerationOptions {
  prompt: string
  model?: ImageModel
  size?: string
  resolution?: '1k' | '2k' | '4k'
  n?: number
  output_format?: 'jpeg' | 'png'
}

export interface ImageGenerationResult {
  success: boolean
  imageUrl?: string
  imageBase64?: string
  taskId?: string
  error?: string
}

export interface TaskStatusResult {
  success: boolean
  status?: 'submitted' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

// GPT Image 2 API 端点
const GPT_IMAGE_2_URL = `${APIMART_API_URL}/v1/images/generations`
const TASK_STATUS_URL = `${APIMART_API_URL}/v1/tasks`

/**
 * 提交图像生成任务
 */
async function submitImageGeneration(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const {
    prompt,
    model = 'gpt-image-2',
    size = '1:1',
    resolution = '1k',
    n = 1,
    output_format
  } = options

  if (!APIMART_API_KEY) {
    return { success: false, error: 'Apimart API 未配置' }
  }

  try {
    const requestBody: Record<string, any> = {
      model,
      prompt,
      n,
      size
    }

    // Seedream uses 2K/3K/4K resolution format
    if (model === 'doubao-seedream-5-0-lite') {
      if (resolution === '1k') {
        requestBody.resolution = '2K'
      } else if (resolution === '2k') {
        requestBody.resolution = '3K'
      } else {
        requestBody.resolution = resolution?.toUpperCase()
      }
    } else {
      requestBody.resolution = resolution
    }

    // Add output format for Seedream
    if (output_format) {
      requestBody.output_format = output_format
    }

    const response = await fetch(GPT_IMAGE_2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIMART_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Image generation API error:', response.status, errorData)
      return { success: false, error: `API 请求失败: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message || '图像生成失败' }
    }

    // 返回 task_id 用于后续查询
    const taskId = data.data?.[0]?.task_id
    if (taskId) {
      return { success: true, taskId }
    }

    return { success: false, error: '未获取到任务ID' }
  } catch (error) {
    console.error('Image generation error:', error)
    return { success: false, error: '网络请求失败' }
  }
}

/**
 * 查询任务状态
 */
async function checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
  try {
    const response = await fetch(`${TASK_STATUS_URL}/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APIMART_API_KEY}`
      }
    })

    if (!response.ok) {
      return { success: false, error: `查询失败: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message || '查询失败' }
    }

    const status = data.data?.status
    if (status === 'completed') {
      const imageUrl = data.data?.result?.images?.[0]?.url?.[0]
      if (imageUrl) {
        return { success: true, status: 'completed', imageUrl }
      }
      return { success: false, error: '未获取到图片URL' }
    }

    if (status === 'failed') {
      return { success: false, status: 'failed', error: data.data?.error?.message || '生成失败' }
    }

    return { success: true, status: status || 'processing' }
  } catch (error) {
    console.error('Task status check error:', error)
    return { success: false, error: '网络请求失败' }
  }
}

/**
 * 轮询等待图像生成完成
 */
async function pollTaskCompletion(taskId: string, maxWaitTime: number = 120000): Promise<TaskStatusResult> {
  const startTime = Date.now()
  const pollInterval = 5000 // 5秒轮询一次

  // 首次查询延迟 15 秒
  await new Promise(resolve => setTimeout(resolve, 15000))

  while (Date.now() - startTime < maxWaitTime) {
    const result = await checkTaskStatus(taskId)

    if (!result.success) {
      return result
    }

    if (result.status === 'completed') {
      return result
    }

    if (result.status === 'failed') {
      return result
    }

    // 继续等待
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  return { success: false, error: '等待超时' }
}

/**
 * 生成图像（同步等待完成）
 * 优先 Apimart GPT-Image-2，网络不可达时自动回退到 MiniMax image-01
 * @param options 生成选项
 * @returns 生成的图像 URL
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const model = options.model || 'gpt-image-2'

  // MiniMax image-01: 直接返回 URL，无需轮询
  if (model === 'minimax-image-01') {
    return generateMiniMaxImage(options.prompt, options.n)
  }

  // Apimart GPT-Image 2 / Seedream: 提交 + 轮询
  const submitResult = await submitImageGeneration(options)

  // API 网络不可达时自动回退到 MiniMax
  if (!submitResult.success) {
    const isNetworkError = submitResult.error?.includes('网络请求失败') || submitResult.error?.includes('fetch failed')
    if (isNetworkError && MINIMAX_API_KEY) {
      console.log('⚠️ Apimart 不可达，回退到 MiniMax image-01')
      return generateMiniMaxImage(options.prompt, options.n)
    }
    return submitResult
  }

  if (!submitResult.taskId) {
    return submitResult
  }

  const pollResult = await pollTaskCompletion(submitResult.taskId)
  if (pollResult.success && pollResult.imageUrl) {
    return { success: true, imageUrl: pollResult.imageUrl }
  }
  return { success: false, error: pollResult.error || '图像生成超时' }
}

/**
 * 使用 MiniMax image-01 生成图像（同步，无需轮询）
 */
async function generateMiniMaxImage(prompt: string, n: number = 1): Promise<ImageGenerationResult> {
  if (!MINIMAX_API_KEY) {
    return { success: false, error: 'MiniMax API 未配置' }
  }

  // MiniMax image-01 单次请求限制 max 20 张
  const safeN = Math.min(Math.max(n, 1), 20)

  try {
    const response = await fetch('https://api.minimaxi.com/v1/image_generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt,
        num: safeN,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('MiniMax image API error:', response.status, errorData)
      return { success: false, error: `MiniMax 图像请求失败: ${response.status}` }
    }

    const data = await response.json()
    if (data.base_resp?.status_code !== 0) {
      return { success: false, error: data.base_resp?.status_msg || 'MiniMax 图像生成失败' }
    }

    const imageUrl = data.data?.image_urls?.[0]
    if (imageUrl) {
      return { success: true, imageUrl }
    }
    return { success: false, error: 'MiniMax 未返回图片URL' }
  } catch (error) {
    console.error('MiniMax image error:', error)
    return { success: false, error: 'MiniMax 图像网络请求失败' }
  }
}

/**
 * 仅提交图像生成任务（不等待）
 */
export async function submitImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  return submitImageGeneration(options)
}

/**
 * 根据提示词生成配图
 * @param prompt 英文提示词
 * @param model 使用的模型
 */
export async function generateImageFromPrompt(
  prompt: string,
  model: ImageModel = 'gpt-image-2'
): Promise<ImageGenerationResult> {
  return generateImage({ prompt, model })
}
