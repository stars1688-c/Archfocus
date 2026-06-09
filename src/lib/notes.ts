/**
 * 计算两个字符串的 Levenshtein 距离（支持插入、删除、替换操作）
 */
export function calculateStringDiff(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 0

  const len1 = s1.length
  const len2 = s2.length

  // 创建 DP 表
  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))

  // 初始化边界
  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j

  // 填充 DP 表
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        )
      }
    }
  }

  return dp[len1][len2]
}

/**
 * 判断两个标题是否匹配（允许 ≤3 字差异）
 */
export function isTitleMatch(title1: string, title2: string, maxDiff = 3): boolean {
  return calculateStringDiff(title1, title2) <= maxDiff
}

/**
 * 在列表中查找与给定标题匹配的笔记
 */
export function findMatchingNote(
  platformNote: { title: string; note_id: string },
  localNotes: Array<{ id: string; title: string }>
): { id: string; title: string } | null {
  for (const note of localNotes) {
    if (isTitleMatch(platformNote.title, note.title)) {
      return note
    }
  }
  return null
}