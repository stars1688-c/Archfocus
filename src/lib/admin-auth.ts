import { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const secret = new TextEncoder().encode(JWT_SECRET)

export interface AdminUser {
  id: string
  username: string
}

export async function signAdminToken(payload: { userId: string; username: string }): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const id = payload.userId as string
    if (!id) return null

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, username: true },
    })

    if (!admin) return null
    return admin
  } catch {
    return null
  }
}

export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, secret)
    const id = payload.userId as string
    if (!id) return null

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, username: true },
    })

    if (!admin) return null
    return admin
  } catch {
    return null
  }
}
