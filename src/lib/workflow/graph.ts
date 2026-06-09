// src/lib/workflow/graph.ts

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import { topicGenerationNode, contentGenerationNode, humanizerNode, sensitiveCheckNode } from './nodes'
import { imagePromptGenerationNode, imageGenerationNode, htmlScreenshotNode } from './imageNodes'

// ============================================
// 文案生成工作流
// ============================================

const ContentWorkflowAnnotation = Annotation.Root({
  // 输入
  account: Annotation<any>,
  topic: Annotation<string | undefined>,

  // 中间状态
  topics: Annotation<any[] | undefined>,
  selectedTopic: Annotation<string | undefined>,
  searchResults: Annotation<string[] | undefined>,
  rawContent: Annotation<string | undefined>,
  humanizedContent: Annotation<string | undefined>,
  sensitiveResult: Annotation<any | undefined>,

  // 配置
  searchEnabled: Annotation<boolean>,
  userRequirements: Annotation<string | undefined>,
  excludeTopics: Annotation<string[] | undefined>,
  userFeedback: Annotation<string | undefined>,

  // 流程控制
  currentStep: Annotation<string>,
})

function contentShouldContinue(state: any): string {
  switch (state.currentStep) {
    case 'topic_generation':
      return 'contentGeneration'
    case 'content_generation':
      return 'humanization'
    case 'humanization':
      return 'sensitiveCheck'
    case 'sensitive_check':
      return END
    case 'done':
    case 'error':
      return END
    default:
      return END
  }
}

const contentWorkflow = new StateGraph(ContentWorkflowAnnotation)
  .addNode('topicGeneration', topicGenerationNode)
  .addNode('contentGeneration', contentGenerationNode)
  .addNode('humanization', humanizerNode)
  .addNode('sensitiveCheck', sensitiveCheckNode)
  .addEdge(START, 'topicGeneration')
  .addEdge('topicGeneration', 'contentGeneration')
  .addEdge('contentGeneration', 'humanization')
  .addEdge('humanization', 'sensitiveCheck')
  .addConditionalEdges('sensitiveCheck', contentShouldContinue)
  .compile()

// ============================================
// 配图生成工作流
// ============================================

const ImageWorkflowAnnotation = Annotation.Root({
  // 输入
  content: Annotation<string>,
  title: Annotation<string | undefined>,

  // 中间状态
  imagePrompt: Annotation<string | undefined>,
  generatedImageUrl: Annotation<string | undefined>,
  htmlScreenshotUrl: Annotation<string | undefined>,

  // 配置
  imageType: Annotation<string>,
  imageModel: Annotation<string | undefined>,

  // 流程控制
  currentStep: Annotation<string>,
})

function imageShouldContinue(state: any): string {
  switch (state.currentStep) {
    case 'image_prompt_generation':
      return state.imageType === 'ai_prompt' ? 'imageGeneration' : 'htmlScreenshot'
    case 'image_generation':
    case 'htmlScreenshot':
      return END
    case 'done':
    case 'error':
      return END
    default:
      return END
  }
}

const imageWorkflow = new StateGraph(ImageWorkflowAnnotation)
  .addNode('imagePromptGeneration', imagePromptGenerationNode)
  .addNode('imageGeneration', imageGenerationNode)
  .addNode('htmlScreenshot', htmlScreenshotNode)
  .addEdge(START, 'imagePromptGeneration')
  .addConditionalEdges('imagePromptGeneration', imageShouldContinue)
  .addConditionalEdges('imageGeneration', imageShouldContinue)
  .addConditionalEdges('htmlScreenshot', imageShouldContinue)
  .compile()

export { contentWorkflow, imageWorkflow }
