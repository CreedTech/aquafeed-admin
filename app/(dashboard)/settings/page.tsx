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
  value: number | string;
  description: string;
  category: 'FINANCIAL' | 'SCIENTIFIC' | 'SOLVER' | 'SYSTEM';
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'SCIENTIFIC' | 'FINANCIAL' | 'SOLVER'
  >('SCIENTIFIC');

  const { data: configs, isLoading } = useQuery({
    queryKey: ['configurations'],
    queryFn: async () => {
      const { data } = await api.get('/admin/configurations');
      return data.configurations as ConfigItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { key: string; value: number | string }) =>
      api.put(`/admin/configurations/${data.key}`, { value: data.value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations'] });
    },
  });

  const groupedConfigs = {
    SCIENTIFIC: configs?.filter((c) => c.category === 'SCIENTIFIC') || [],
    FINANCIAL: configs?.filter((c) => c.category === 'FINANCIAL') || [],
    SOLVER: configs?.filter((c) => c.category === 'SOLVER') || [],
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
  isUpdating,
}: {
  config: ConfigItem;
  onUpdate: (val: number | string) => void;
  isUpdating: boolean;
}) {
  const [localValue, setLocalValue] = useState(config.value);

  const keyLabels: Record<string, string> = {
    energy_protein_mult: 'Energy Multiplier (Protein)',
    energy_carb_mult: 'Energy Multiplier (Carb)',
    energy_fat_mult: 'Energy Multiplier (Fat)',
    energy_global_mult: 'Final Energy Multiplier',
    formulation_fee: 'Standard Formulation Fee',
    formulation_unlock_fee: 'Premium Unlock Fee (₦)',
    demo_weight_limit: 'Free Trial Weight Limit (kg)',
    currency_exchange_usd: 'Exchange Rate (USD to NGN)',
    currency_exchange_ghs: 'Exchange Rate (GHS to NGN)',
    preferred_ingredient_penalty: 'Maize Dominance Penalty (%)',
    min_animal_protein_pct: 'Min Animal Protein (Catfish)',
    blood_meal_max_ratio: 'Blood Meal Max Ratio (%)',
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
          <input
            type="number"
            step="0.0001"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
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
    </div>
  );
}
