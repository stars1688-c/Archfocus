import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/hot-keywords - 获取热点词推荐
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ success: false, error: '账号ID不能为空' }, { status: 400 })
    }

    // 获取账号信息
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    // 构建搜索词：结合人设和受众人群
    const keywords: string[] = []
    const baseWords = [
      account.position || '', // 美妆博主
      account.audience || '', // 年轻女性
    ].filter(Boolean)

    // 使用百度搜索建议 API 获取热点词
    const fetchBaiduSuggestions = async (keyword: string): Promise<string[]> => {
      try {
        const response = await fetch(
          `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/plain; charset=gbk',
            },
          }
        )
        const buffer = await response.arrayBuffer()
        const decoder = new TextDecoder('gbk')
        const text = decoder.decode(buffer)
        // 解析 JSONP 响应
        const match = text.match(/window\.baidu\.sug\({[^}]+s:(\[.+?\])\}\)/)
        if (match) {
          return JSON.parse(match[1])
        }
      } catch (error) {
        console.error('Baidu suggestions error:', error)
      }
      return []
    }

    // 为每个基础词获取建议
    for (const word of baseWords) {
      const suggestions = await fetchBaiduSuggestions(word)
      keywords.push(...suggestions.slice(0, 5))
    }

    // 去重
    const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 20)

    return NextResponse.json({
      success: true,
      data: {
        keywords: uniqueKeywords,
        source: 'baidu',
        account: {
          position: account.position,
          audience: account.audience,
        },
      },
    })
  } catch (error) {
    console.error('Hot keywords error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}