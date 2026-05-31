'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  BrainCircuit,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Zap,
  Settings,
  ArrowLeft,
  Cpu,
  ImageIcon,
  SlidersHorizontal,
  Plug,
  Server,
  Shield,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ProviderType = 'zai-sdk' | 'openai' | 'anthropic' | 'custom';

interface ProviderOption {
  id: ProviderType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface AiConfig {
  provider: ProviderType;
  llmModel: string;
  customEndpoint: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  imageModel: string;
  imageApiKey: string;
  generateSystemDiagram: boolean;
  generateDigitalTwin: boolean;
  generateMachineImage: boolean;
  generateSpareParts: boolean;
  generateBom: boolean;
  autoComponentCount: boolean;
}

interface TestResult {
  success: boolean;
  responseTime?: number;
  model?: string;
  error?: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'zai-sdk',
    label: 'Z.ai SDK (Built-in)',
    description: 'Use the built-in Z.ai SDK — no API key needed',
    icon: Zap,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4-turbo, GPT-3.5-turbo, and more',
    icon: Cpu,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku',
    icon: Shield,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    id: 'custom',
    label: 'Custom Endpoint',
    description: 'Connect to any OpenAI-compatible API endpoint',
    icon: Server,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
];

const MODEL_SUGGESTIONS: Record<ProviderType, string[]> = {
  'zai-sdk': ['z-ai-default'],
  'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  'custom': [],
};

const IMAGE_MODEL_SUGGESTIONS: Record<ProviderType, string[]> = {
  'zai-sdk': ['z-ai-image'],
  'openai': ['dall-e-3', 'dall-e-2'],
  'anthropic': [],
  'custom': [],
};

const DEFAULT_CONFIG: AiConfig = {
  provider: 'zai-sdk',
  llmModel: 'z-ai-default',
  customEndpoint: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 4000,
  imageModel: 'z-ai-image',
  imageApiKey: '',
  generateSystemDiagram: true,
  generateDigitalTwin: true,
  generateMachineImage: true,
  generateSpareParts: true,
  generateBom: true,
  autoComponentCount: true,
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ConfigLoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function AIConfigPage() {
  const { navigate } = useNavigationStore();

  // Form state
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showImageApiKey, setShowImageApiKey] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // ── Fetch existing config ──
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AiConfig>('/api/ai/config');
      if (res.success && res.data) {
        setConfig({ ...DEFAULT_CONFIG, ...res.data });
      }
    } catch {
      // Use defaults if no config exists yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ── Handle field changes ──
  const updateConfig = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    // Clear test result when config changes
    setTestResult(null);
  };

  // ── When provider changes, update default model ──
  const handleProviderChange = (provider: ProviderType) => {
    const defaultModel = MODEL_SUGGESTIONS[provider][0] || '';
    const defaultImageModel = IMAGE_MODEL_SUGGESTIONS[provider][0] || '';
    setConfig(prev => ({
      ...prev,
      provider,
      llmModel: defaultModel,
      imageModel: defaultImageModel,
      // Clear API key when switching to built-in
      ...(provider === 'zai-sdk' ? { apiKey: '', imageApiKey: '' } : {}),
    }));
    setTestResult(null);
  };

  // ── Test connection ──
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const startTime = Date.now();
      const payload = {
        provider: config.provider,
        llmModel: config.llmModel,
        customEndpoint: config.customEndpoint || undefined,
        apiKey: config.apiKey || undefined,
      };
      const res = await api.post<TestResult>('/api/ai/config/test', payload, {
        timeout: 30_000,
      });
      const responseTime = Date.now() - startTime;
      if (res.success && res.data) {
        setTestResult({ ...res.data, responseTime });
      } else {
        setTestResult({ success: false, responseTime, error: res.error || 'Connection test failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  // ── Save configuration ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/api/ai/config', config);
      if (res.success) {
        toast.success('AI configuration saved successfully');
      } else {
        toast.error(res.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ConfigLoadingSkeleton />;

  const isBuiltIn = config.provider === 'zai-sdk';

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('ai-hub')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              AI Configuration
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure your AI provider, models, and generation defaults
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px]">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* ── Provider Selection ── */}
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <h2 className="text-sm font-semibold">Provider Selection</h2>
              </div>
              <RadioGroup
                value={config.provider}
                onValueChange={(v) => handleProviderChange(v as ProviderType)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {PROVIDERS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-start gap-2.5 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        config.provider === p.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <RadioGroupItem value={p.id} className="mt-0.5" />
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded-md ${p.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${p.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{p.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* ── LLM Configuration ── */}
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-sm font-semibold">LLM Configuration</h2>
              </div>

              {/* Model Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Model Name</Label>
                <Input
                  value={config.llmModel}
                  onChange={(e) => updateConfig('llmModel', e.target.value)}
                  placeholder={MODEL_SUGGESTIONS[config.provider][0] || 'Enter model name...'}
                  className="h-9 text-sm"
                />
                {MODEL_SUGGESTIONS[config.provider].length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {MODEL_SUGGESTIONS[config.provider].map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => updateConfig('llmModel', model)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          config.llmModel === model
                            ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Endpoint (only for custom provider) */}
              {config.provider === 'custom' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Custom Endpoint URL</Label>
                  <Input
                    value={config.customEndpoint}
                    onChange={(e) => updateConfig('customEndpoint', e.target.value)}
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}

              {/* API Key (not for built-in) */}
              {!isBuiltIn && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) => updateConfig('apiKey', e.target.value)}
                      placeholder="sk-..."
                      className="h-9 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {config.apiKey && (
                    <p className="text-[10px] text-muted-foreground">
                      Currently set: {config.apiKey.substring(0, 6)}{'•'.repeat(12)}{config.apiKey.length > 18 ? config.apiKey.slice(-4) : ''}
                    </p>
                  )}
                </div>
              )}

              <Separator className="my-1" />

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Temperature</Label>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {config.temperature.toFixed(1)}
                  </Badge>
                </div>
                <Slider
                  value={[config.temperature]}
                  onValueChange={(v) => updateConfig('temperature', v[0])}
                  min={0}
                  max={1.5}
                  step={0.1}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Max Tokens</Label>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {config.maxTokens.toLocaleString()}
                  </Badge>
                </div>
                <Slider
                  value={[config.maxTokens]}
                  onValueChange={(v) => updateConfig('maxTokens', v[0])}
                  min={1000}
                  max={16000}
                  step={1000}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1,000</span>
                  <span>8,000</span>
                  <span>16,000</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Image Generation ── */}
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <h2 className="text-sm font-semibold">Image Generation</h2>
                <Badge variant="outline" className="text-[10px]">Optional</Badge>
              </div>

              {/* Image Model */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Image Model</Label>
                <Input
                  value={config.imageModel}
                  onChange={(e) => updateConfig('imageModel', e.target.value)}
                  placeholder={IMAGE_MODEL_SUGGESTIONS[config.provider][0] || 'Enter image model name...'}
                  className="h-9 text-sm"
                />
                {IMAGE_MODEL_SUGGESTIONS[config.provider].length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {IMAGE_MODEL_SUGGESTIONS[config.provider].map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => updateConfig('imageModel', model)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          config.imageModel === model
                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image API Key (optional, separate from LLM) */}
              {!isBuiltIn && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Image API Key <span className="text-muted-foreground font-normal">(optional, separate from LLM)</span></Label>
                  <div className="relative">
                    <Input
                      type={showImageApiKey ? 'text' : 'password'}
                      value={config.imageApiKey}
                      onChange={(e) => updateConfig('imageApiKey', e.target.value)}
                      placeholder="Leave blank to use LLM API key"
                      className="h-9 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageApiKey(!showImageApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showImageApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {/* ── Generation Defaults ── */}
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <h2 className="text-sm font-semibold">Generation Defaults</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Toggle which artifacts AI generates for each new asset. These defaults can be overridden per generation.
              </p>

              <div className="space-y-3">
                {[
                  { key: 'generateSystemDiagram' as const, label: 'System Diagram', desc: 'Interactive component diagram with connections' },
                  { key: 'generateDigitalTwin' as const, label: 'Digital Twin', desc: '3D scene configuration with spatial layout' },
                  { key: 'generateMachineImage' as const, label: 'Machine Image', desc: 'AI-generated illustration of the machine' },
                  { key: 'generateSpareParts' as const, label: 'Spare Parts', desc: 'Inventory items with reorder levels and suppliers' },
                  { key: 'generateBom' as const, label: 'Bill of Materials', desc: 'Detailed BOM with part numbers and quantities' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border p-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={config[item.key]}
                      onCheckedChange={(checked) => updateConfig(item.key, checked)}
                    />
                  </div>
                ))}

                <Separator className="my-1" />

                {/* Auto/Manual component counts */}
                <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Auto Component Counts</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Let AI decide how many components to generate per subsystem
                    </p>
                  </div>
                  <Switch
                    checked={config.autoComponentCount}
                    onCheckedChange={(checked) => updateConfig('autoComponentCount', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Test Connection ── */}
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-semibold">Test Connection</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Verify your AI configuration is working by sending a test request.
              </p>

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || isBuiltIn}
                className="w-full gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    {isBuiltIn ? 'Built-in SDK — No Test Needed' : 'Test Connection'}
                  </>
                )}
              </Button>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`rounded-lg border p-3 space-y-1.5 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <p className={`text-xs font-semibold ${testResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                  </div>
                  {testResult.success && (
                    <div className="flex items-center gap-3 text-[10px] text-emerald-600 dark:text-emerald-500">
                      {testResult.model && <span>Model: {testResult.model}</span>}
                      {testResult.responseTime && <span>Response: {testResult.responseTime}ms</span>}
                    </div>
                  )}
                  {!testResult.success && testResult.error && (
                    <p className="text-[10px] text-red-600 dark:text-red-500">{testResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Save Button ── */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('ai-hub')}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Hub
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
