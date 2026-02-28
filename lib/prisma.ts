import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.')
}

const adapter = new PrismaPg({ connectionString })

export const prisma =
    globalForPrisma.prisma ??
    (() => {
        const client = new PrismaClient({ adapter })
        globalForPrisma.prisma = client
        return client
    })()