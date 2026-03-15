'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Save,
  RefreshCcw,
  Zap,
  DollarSign,
  Beaker,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface ConfigItem {
  key: string;
  value: number | string | boolean;
  description: string;
  category: 'FINANCIAL' | 'SCIENTIFIC' | 'SOLVER' | 'SYSTEM';
}

interface OpenRouterModelSummary {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing: {
    prompt?: number;
    completion?: number;
  };
  isFree: boolean;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'SCIENTIFIC' | 'FINANCIAL' | 'SOLVER' | 'SYSTEM'
  >('SCIENTIFIC');

  const { data: configs, isLoading } = useQuery({
    queryKey: ['configurations'],
    queryFn: async () => {
      const { data } = await api.get('/admin/configurations');
      return data.configurations as ConfigItem[];
    },
  });

  const { data: openRouterModels } = useQuery({
    queryKey: ['admin-openrouter-models'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ai/openrouter-models');
      return (data.models || []) as OpenRouterModelSummary[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { key: string; value: number | string | boolean }) =>
      api.put(`/admin/configurations/${data.key}`, { value: data.value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations'] });
    },
  });

  const groupedConfigs = {
    SCIENTIFIC: configs?.filter((c) => c.category === 'SCIENTIFIC') || [],
    FINANCIAL: configs?.filter((c) => c.category === 'FINANCIAL') || [],
    SOLVER: configs?.filter((c) => c.category === 'SOLVER') || [],
    SYSTEM: configs?.filter((c) => c.category === 'SYSTEM') || [],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            System Configuration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Global constants, fees, and scientific multipliers for the Joggler
            engine
          </p>
        </div>
        <button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ['configurations'] })
          }
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('SCIENTIFIC')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'SCIENTIFIC'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Beaker size={16} />
          Scientific
        </button>
        <button
          onClick={() => setActiveTab('FINANCIAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'FINANCIAL'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign size={16} />
          Financial
        </button>
        <button
          onClick={() => setActiveTab('SOLVER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'SOLVER'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap size={16} />
          Solver
        </button>
        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'SYSTEM'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheck size={16} />
          AI & System
        </button>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groupedConfigs[activeTab].map((config) => (
          <ConfigCard
            key={config.key}
            config={config}
            onUpdate={(val) =>
              updateMutation.mutate({ key: config.key, value: val })
            }
            modelCatalog={openRouterModels || []}
            isUpdating={
              updateMutation.isPending &&
              updateMutation.variables?.key === config.key
            }
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="text-blue-500 shrink-0" size={20} />
        <div>
          <p className="text-sm font-semibold text-blue-900">Safety Notice</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Changes to scientific constants affect all calorie and nutrient
            calculations system-wide. Please verify values with the scientific
            team before saving.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfigCard({
  config,
  onUpdate,
  modelCatalog,
  isUpdating,
}: {
  config: ConfigItem;
  onUpdate: (val: number | string | boolean) => void;
  modelCatalog: OpenRouterModelSummary[];
  isUpdating: boolean;
}) {
  const [localValue, setLocalValue] = useState(config.value);
  const isBoolean = typeof config.value === 'boolean';
  const isNumber = typeof config.value === 'number';
  const isModelConfigKey = [
    'ai_openrouter_primary_model',
    'ai_openrouter_fallback_model',
    'ai_default_free_model',
    'ai_paid_fallback_model',
  ].includes(config.key);
  const modelOptions =
    config.key === 'ai_default_free_model'
      ? modelCatalog.filter((model) => model.isFree)
      : modelCatalog;
  const selectedModel = modelOptions.find((m) => m.id === String(localValue));

  const keyLabels: Record<string, string> = {
    energy_protein_mult: 'Energy Multiplier (Protein)',
    energy_carb_mult: 'Energy Multiplier (Carb)',
    energy_fat_mult: 'Energy Multiplier (Fat)',
    energy_global_mult: 'Final Energy Multiplier',
    formulation_fee: 'Standard Formulation Fee',
    demo_weight_limit: 'Free Trial Weight Limit (kg)',
    currency_exchange_usd: 'Exchange Rate (USD to NGN)',
    currency_exchange_ghs: 'Exchange Rate (GHS to NGN)',
    preferred_ingredient_penalty: 'Maize Dominance Penalty (%)',
    min_animal_protein_percent: 'Min Animal Protein (Fish)',
    min_animal_protein_pct: 'Min Animal Protein (Fish, legacy)',
    blood_meal_max_ratio: 'Blood Meal Max Ratio (%)',
    suggestion_allow_relaxations: 'Allow One-Tap Relaxations',
    suggestion_max_relaxation_step_pct: 'Max Relaxation Step (%)',
    suggestion_rank_strategy: 'Suggestion Ranking Strategy',
    ai_enabled: 'Enable AI Analyst',
    ai_openrouter_base_url: 'OpenRouter Base URL',
    ai_openrouter_primary_model: 'AI Primary Model',
    ai_openrouter_fallback_model: 'AI Fallback Model',
    ai_free_first_enabled: 'AI Free-First Routing',
    ai_allow_paid_fallback: 'Allow Paid Fallback',
    ai_default_free_model: 'Default Free Model',
    ai_paid_fallback_model: 'Paid Fallback Model',
    ai_openrouter_temperature: 'AI Temperature',
    ai_openrouter_max_tokens: 'AI Max Output Tokens',
    ai_openrouter_timeout_ms: 'AI Timeout (ms)',
    ai_cost_input_per_1k: 'AI Input Cost (USD/1k)',
    ai_cost_output_per_1k: 'AI Output Cost (USD/1k)',
    ai_soft_budget_daily_usd: 'AI Daily Alert Threshold (No Billing)',
    ai_soft_budget_monthly_usd: 'AI Monthly Alert Threshold (No Billing)',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary/30 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">
          {keyLabels[config.key] || config.key.replace(/_/g, ' ').toUpperCase()}
        </h3>
        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase">
          {config.key}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        {config.description}
      </p>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {isBoolean ? (
            <select
              value={String(localValue)}
              onChange={(e) => setLocalValue(e.target.value === 'true')}
              className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : isModelConfigKey ? (
            <>
              <input
                list={`model-options-${config.key}`}
                value={String(localValue)}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="Search model id"
                className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <datalist id={`model-options-${config.key}`}>
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </datalist>
            </>
          ) : (
            <input
              type={isNumber ? 'number' : 'text'}
              step={isNumber ? '0.0001' : undefined}
              value={String(localValue)}
              onChange={(e) =>
                setLocalValue(isNumber ? Number(e.target.value) : e.target.value)
              }
              className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          )}
        </div>
        <button
          onClick={() => onUpdate(localValue)}
          disabled={localValue === config.value || isUpdating}
          className="p-2.5 bg-primary text-white rounded-lg disabled:bg-gray-100 disabled:text-gray-400 hover:bg-primary-dark transition-all shrink-0"
        >
          {isUpdating ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
        </button>
      </div>
      {isModelConfigKey && selectedModel ? (
        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <div className="font-semibold text-gray-800">
            {selectedModel.name}
          </div>
          <div className="mt-1">
            {selectedModel.isFree ? 'Free model' : 'Paid model'}
            {selectedModel.contextLength
              ? ` • Context: ${selectedModel.contextLength.toLocaleString()}`
              : ''}
          </div>
          <div className="mt-1">
            Prompt: {selectedModel.pricing.prompt ?? 0} USD/token • Completion:{' '}
            {selectedModel.pricing.completion ?? 0} USD/token
          </div>
        </div>
      ) : null}
    </div>
  );
}
