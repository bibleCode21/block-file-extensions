import 'server-only'
import { prisma } from '@/lib/prisma'
import type { ExtensionRuleSet, Extension } from '@prisma/client'

export type RuleSetWithExtensions = ExtensionRuleSet & { extensions: Extension[] }

export type ExtensionInfo = {
    isFixed: boolean
    ruleSetId: string
}

export class ExtensionPolicyRepository {
    async findByKey(key: string): Promise<RuleSetWithExtensions | null> {
        return prisma.extensionRuleSet.findUnique({
            where: { key },
            include: { extensions: { orderBy: { extensionName: 'asc' } } },
        })
    }

    async createWithExtensions(data: {
        key: string
        name: string
        isDefault: boolean
        extensions: Array<{ extensionName: string; isFixed: boolean; enabled: boolean }>
    }): Promise<RuleSetWithExtensions> {
        return prisma.extensionRuleSet.create({
            data: {
                key: data.key,
                name: data.name,
                isDefault: data.isDefault,
                extensions: { create: data.extensions },
            },
            include: { extensions: true },
        })
    }

    async findExtension(ruleSetKey: string, extensionName: string): Promise<ExtensionInfo | null> {
        return prisma.extension.findFirst({
            where: {
                extensionName,
                ruleSet: { key: ruleSetKey },
            },
            select: { isFixed: true, ruleSetId: true },
        })
    }

    async updateExtensionEnabled(ruleSetId: string, extensionName: string, enabled: boolean): Promise<void> {
        await prisma.extension.update({
            where: {
                ruleSetId_extensionName: { ruleSetId, extensionName },
            },
            data: { enabled },
        })
    }

    async getMaxCustomExtensions(key: string): Promise<number> {
        const ruleSet = await prisma.extensionRuleSet.findUnique({
            where: { key },
            select: { maxCustomExtensions: true },
        })
        return ruleSet?.maxCustomExtensions ?? 200
    }

    async syncPolicy(
        key: string,
        name: string,
        isDefault: boolean,
        fixedExtensions: Map<string, boolean>,
        customExtensions: string[],
    ): Promise<RuleSetWithExtensions> {
        const fixedNames = [...fixedExtensions.keys()]

        return prisma.$transaction(async tx => {
            const ruleSet = await tx.extensionRuleSet.upsert({
                where: { key },
                create: { key, name, isDefault },
                update: { name, isDefault },
            })

            await tx.extension.deleteMany({
                where: {
                    ruleSetId: ruleSet.id,
                    OR: [
                        { isFixed: true, extensionName: { notIn: fixedNames } },
                        { isFixed: false, extensionName: { notIn: customExtensions } },
                    ],
                },
            })

            for (const [extensionName, enabled] of fixedExtensions.entries()) {
                await tx.extension.upsert({
                    where: { ruleSetId_extensionName: { ruleSetId: ruleSet.id, extensionName } },
                    create: { ruleSetId: ruleSet.id, extensionName, enabled, isFixed: true },
                    update: { enabled, isFixed: true },
                })
            }

            for (const extensionName of customExtensions) {
                await tx.extension.upsert({
                    where: { ruleSetId_extensionName: { ruleSetId: ruleSet.id, extensionName } },
                    create: { ruleSetId: ruleSet.id, extensionName, enabled: true, isFixed: false },
                    update: { enabled: true, isFixed: false },
                })
            }

            const refreshed = await tx.extensionRuleSet.findUnique({
                where: { id: ruleSet.id },
                include: { extensions: true },
            })

            if (!refreshed) throw new Error('정책 저장 후 조회에 실패했습니다.')
            return refreshed
        })
    }
}
