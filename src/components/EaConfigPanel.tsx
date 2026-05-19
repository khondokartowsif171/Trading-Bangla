import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { resetAccount } from '@/services/paperTradingService';
import { Settings, RotateCcw } from 'lucide-react';

export default function EaConfigPanel() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [config, setConfig] = useState({
    autoLot: true, trailing: true, sessionFilter: false, rrMode: false,
    riskPercent: 1.0, maxTrades: 3, magicNum: 202400,
  });

  const toggle = (key: keyof typeof config) => {
    if (typeof config[key] === 'boolean') setConfig(p => ({ ...p, [key]: !p[key] as any }));
  };

  const items = [
    { key: 'autoLot' as const, label: isBn ? 'অটো লট সাইজ' : 'Auto Lot Size' },
    { key: 'trailing' as const, label: isBn ? 'ট্রেলিং স্টপ' : 'Trailing Stop' },
    { key: 'sessionFilter' as const, label: isBn ? 'সেশন ফিল্টার' : 'Session Filter' },
    { key: 'rrMode' as const, label: 'R:R Mode' },
  ];

  return (
    <div className={`rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <h3 className={`text-xs font-bold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Settings className="w-3.5 h-3.5 text-yellow-400" /> {isBn ? 'EA কনফিগ' : 'EA Config'}
        </h3>
        <button onClick={() => { resetAccount(); }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
            darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          <RotateCcw className="w-3 h-3" /> {isBn ? 'রিসেট' : 'Reset'}
        </button>
      </div>
      <div className="p-3 space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</span>
            <label className="relative w-9 h-5 cursor-pointer">
              <input type="checkbox" checked={config[item.key]} onChange={() => toggle(item.key)} className="hidden" />
              <div className={`absolute inset-0 rounded-full transition-colors ${config[item.key] ? 'bg-green-500/30' : 'bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-md ${config[item.key] ? 'left-4 bg-green-400' : 'left-0.5 bg-gray-400'}`} />
              </div>
            </label>
          </div>
        ))}
        <div className={`pt-2 mt-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} space-y-1.5`}>
          {[
            { label: isBn ? 'রিস্ক %' : 'Risk %', value: `${config.riskPercent}%` },
            { label: isBn ? 'সর্বোচ্চ ট্রেড' : 'Max Trades', value: config.maxTrades.toString() },
            { label: 'Magic #', value: config.magicNum.toString() },
          ].map(s => (
            <div key={s.label} className="flex justify-between text-[11px]">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{s.label}</span>
              <span className={`font-mono font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
