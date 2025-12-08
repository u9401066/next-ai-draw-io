"use client"

import * as React from "react"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export interface ChatSettings {
    provider: string
    model: string
    baseUrl?: string
    checkAccessCode?: boolean
    accessCode?: string
}

interface SettingsDialogProps {
    settings: ChatSettings
    onSettingsChange: (settings: ChatSettings) => void
}

export function SettingsDialog({ settings, onSettingsChange }: SettingsDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [localSettings, setLocalSettings] = React.useState<ChatSettings>(settings)

    // Sync local state when dialog opens or props change
    React.useEffect(() => {
        setLocalSettings(settings)
    }, [settings, open])

    const handleSave = () => {
        onSettingsChange(localSettings)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="設定">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">設定</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>設定</DialogTitle>
                    <DialogDescription>
                        配置 AI 模型與參數。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="provider">AI 提供者</Label>
                        <Select
                            value={localSettings.provider}
                            onValueChange={(val) => setLocalSettings({ ...localSettings, provider: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="選擇提供者" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="bedrock">AWS Bedrock</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="google">Google Gemini</SelectItem>
                                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="model">模型名稱 (Model ID)</Label>
                        <Input
                            id="model"
                            value={localSettings.model}
                            onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="baseUrl">Base URL (選填)</Label>
                        <Input
                            id="baseUrl"
                            placeholder="https://api.example.com/v1"
                            value={localSettings.baseUrl || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="checkAccessCode"
                            checked={localSettings.checkAccessCode}
                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, checkAccessCode: checked })}
                        />
                        <Label htmlFor="checkAccessCode">啟用存取碼 (Access Code)</Label>
                    </div>

                    {localSettings.checkAccessCode && (
                        <div className="grid gap-2">
                            <Label htmlFor="accessCode">存取碼</Label>
                            <Input
                                id="accessCode"
                                type="password"
                                value={localSettings.accessCode || ''}
                                onChange={(e) => setLocalSettings({ ...localSettings, accessCode: e.target.value })}
                            />
                        </div>
                    )}

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                    <Button type="submit" onClick={handleSave}>儲存變更</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
