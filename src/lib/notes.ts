/**
 * 计算两个字符串的差异字符数（Levenshtein 距离）
 */
export function calculateStringDiff(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 0

  const len1 = s1.length
  const len2 = s2.length

  // 简单实现：字符对比
  let diff = 0
  const minLen = Math.min(len1, len2)

  for (let i = 0; i < minLen; i++) {
    if (s1[i] !== s2[i]) diff++
  }

  // 加上长度差异
  diff += Math.abs(len1 - len2)

  return diff
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