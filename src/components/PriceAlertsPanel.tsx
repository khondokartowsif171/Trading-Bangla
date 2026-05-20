import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAllPrices } from '@/hooks/useMarketData';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { Bell, BellRing, Plus, Trash2, X, CheckCircle, Clock } from 'lucide-react';

const SYMBOL_OPTIONS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'GBP/JPY'];

function fmtPrice(symbol: string, price: number) {
  if (symbol.includes('XAU') || symbol.includes('BTC')) return price.toFixed(2);
  if (symbol.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

export default function PriceAlertsPanel() {
  const { darkMode } = useApp();
  const livePrices = useAllPrices();
  const { alerts, addAlert, removeAlert, clearTriggered, pendingCount, triggeredCount } = usePriceAlerts();
  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState('XAU/USD');
  const [formCond, setFormCond] = useState<'above' | 'below'>('above');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');

  const handleAdd = () => {
    const p = parseFloat(formPrice);
    if (!p || p <= 0) { setFormError('Valid price লিখুন'); return; }
    addAlert(formSymbol, formCond, p);
    setFormPrice('');
    setFormError('');
    setShowForm(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          {pendingCount > 0
            ? <BellRing className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            : <Bell className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          }
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Price Alerts</h3>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{pendingCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {triggeredCount > 0 && (
            <button onClick={clearTriggered}
              className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
              Clear done
            </button>
          )}
          <button onClick={() => { setShowForm(v => !v); setFormError(''); }}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className={`p-4 border-b space-y-3 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
          <div className="grid grid-cols-2 gap-2">
            {/* Symbol */}
            <div>
              <label className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Symbol</label>
              <select value={formSymbol} onChange={e => setFormSymbol(e.target.value)}
                className={`w-full mt-1 px-2 py-1.5 rounded-lg text-xs border outline-none ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}>
                {SYMBOL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Condition */}
            <div>
              <label className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Condition</label>
              <div className="flex gap-1 mt-1">
                {(['above', 'below'] as const).map(c => (
                  <button key={c} onClick={() => setFormCond(c)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      formCond === c
                        ? c === 'above' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : darkMode ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-white text-gray-500 border border-gray-200'
                    }`}>{c === 'above' ? '▲ Above' : '▼ Below'}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Price */}
          <div>
            <label className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Alert Price {livePrices[formSymbol] ? `(live: ${fmtPrice(formSymbol, livePrices[formSymbol].bid)})` : ''}
            </label>
            <input
              type="number" step="any" value={formPrice}
              onChange={e => { setFormPrice(e.target.value); setFormError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={livePrices[formSymbol] ? fmtPrice(formSymbol, livePrices[formSymbol].bid) : '0.00'}
              className={`w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } ${formError ? 'border-red-500' : ''}`}
            />
            {formError && <p className="text-[10px] text-red-400 mt-0.5">{formError}</p>}
          </div>
          <button onClick={handleAdd}
            className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Add Alert
          </button>
        </div>
      )}

      {/* Alert List */}
      <div className="overflow-y-auto max-h-[280px]">
        {alerts.length === 0 ? (
          <div className={`px-4 py-8 text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No alerts set</p>
            <p className="text-[10px] mt-0.5">Click + to add price alert</p>
          </div>
        ) : (
          alerts.map(alert => {
            const liveQ = livePrices[alert.symbol];
            const distPercent = liveQ
              ? (((alert.price - liveQ.bid) / liveQ.bid) * 100).toFixed(2)
              : null;
            return (
              <div key={alert.id}
                className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors ${
                  alert.triggered
                    ? darkMode ? 'bg-green-500/5 border-gray-800/50' : 'bg-green-50 border-gray-100'
                    : darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {alert.triggered
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    : <Clock className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  }
                </div>

                {/* Alert details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alert.symbol}</span>
                    <span className={`text-[10px] font-medium ${alert.condition === 'above' ? 'text-green-400' : 'text-red-400'}`}>
                      {alert.condition === 'above' ? '▲' : '▼'} {fmtPrice(alert.symbol, alert.price)}
                    </span>
                  </div>
                  <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {alert.triggered
                      ? `Triggered ${alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}`
                      : distPercent
                        ? `${parseFloat(distPercent) > 0 ? '+' : ''}${distPercent}% away from live`
                        : 'Watching...'
                    }
                  </div>
                </div>

                {/* Remove */}
                <button onClick={() => removeAlert(alert.id)}
                  className={`p-1 rounded transition-colors shrink-0 ${
                    darkMode ? 'text-gray-700 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                  }`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
