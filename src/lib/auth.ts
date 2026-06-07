import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const secret = new TextEncoder().encode(JWT_SECRET)

export interface AuthUser {
  id: string
  phone: string
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, secret)

    return {
      id: payload.userId as string,
      phone: payload.phone as string,
    }
  } catch {
    return null
  }
}