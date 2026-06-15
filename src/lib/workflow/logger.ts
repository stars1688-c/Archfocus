// src/lib/workflow/logger.ts
// 文件日志工具 — 保存工作流步骤日志到服务器文件

import * as fs from 'fs'
import * as path from 'path'

// 日志级别
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'STEP'

// 日志目录（相对于项目根目录）
const LOG_DIR = path.resolve(process.cwd(), 'logs')

// 确保日志目录存在
function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
  } catch (e) {
    // 如果无法创建目录，静默失败（降级到 console）
  }
}

// 获取当前日志文件路径（按日期轮转）
function getLogFilePath(prefix: string = 'app'): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return path.join(LOG_DIR, `${prefix}-${date}.log`)
}

// 格式化日志行
function formatLog(level: LogLevel, module: string, message: string, extra?: Record<string, any>): string {
  const timestamp = new Date().toISOString()
  const extraStr = extra ? ' | ' + Object.entries(extra)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ') : ''
  return `[${timestamp}] [${level}] [${module}] ${message}${extraStr}`
}

// 写入日志文件
function writeToFile(line: string): void {
  ensureLogDir()
  const filePath = getLogFilePath('workflow')
  try {
    fs.appendFileSync(filePath, line + '\n', 'utf-8')
  } catch (e) {
    // 写文件失败时不再抛异常
  }
}

// ===== 导出 API =====

/** 步骤开始日志 */
export function logStepStart(stepName: string, details?: Record<string, any>): void {
  const msg = '===== 开始 ====='
  const line = formatLog('STEP', stepName, msg, details)
  writeToFile(line)
  console.log(`[${stepName}] ${msg}`, details ? JSON.stringify(details) : '')
}

/** 步骤完成日志 */
export function logStepSuccess(stepName: string, message: string, durationMs: number): void {
  const line = formatLog('STEP', stepName, `完成: ${message}`, { durationMs })
  writeToFile(line)
  console.log(`[${stepName}] 完成: ${message} (${durationMs}ms)`)
}

/** 步骤跳过日志 */
export function logStepSkipped(stepName: string, reason: string): void {
  const line = formatLog('STEP', stepName, `跳过: ${reason}`)
  writeToFile(line)
  console.log(`[${stepName}] 跳过: ${reason}`)
}

/** 步骤错误日志 */
export function logStepError(stepName: string, errorMessage: string, durationMs?: number): void {
  const extra = durationMs ? { durationMs } : undefined
  const line = formatLog('ERROR', stepName, errorMessage, extra)
  writeToFile(line)
  console.error(`[${stepName}] 错误: ${errorMessage}`)
}

/** 通用信息日志 */
export function logInfo(stepName: string, message: string, details?: Record<string, any>): void {
  const line = formatLog('INFO', stepName, message, details)
  writeToFile(line)
  console.log(`[${stepName}] ${message}`)
}

/** 警告日志 */
export function logWarn(stepName: string, message: string, details?: Record<string, any>): void {
  const line = formatLog('WARN', stepName, message, details)
  writeToFile(line)
  console.warn(`[${stepName}] 警告: ${message}`)
}

/** 写入自定义日志（用于业务流程日志） */
export function writeLog(module: string, level: LogLevel, message: string, extra?: Record<string, any>): void {
  const line = formatLog(level, module, message, extra)
  writeToFile(line)
}
