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

    async countCustomExtensions(ruleSetId: string): Promise<number> {
        return prisma.extension.count({
            where: { ruleSetId, isFixed: false },
        })
    }

    async addExtension(
        ruleSetId: string,
        extensionName: string,
        isFixed: boolean,
        enabled: boolean,
    ): Promise<void> {
        await prisma.extension.create({
            data: { ruleSetId, extensionName, isFixed, enabled },
        })
    }

    async removeExtension(ruleSetId: string, extensionName: string): Promise<void> {
        await prisma.extension.delete({
            where: {
                ruleSetId_extensionName: { ruleSetId, extensionName },
            },
        })
    }

    async updateSettings(
        key: string,
        settings: { maxCustomExtensions?: number; maxExtensionNameLength?: number },
    ): Promise<RuleSetWithExtensions> {
        return prisma.extensionRuleSet.update({
            where: { key },
            data: settings,
            include: { extensions: { orderBy: { extensionName: 'asc' } } },
        })
    }
}
