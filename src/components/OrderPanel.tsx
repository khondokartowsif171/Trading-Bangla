import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';

export default function OrderPanel() {
  const { darkMode, t, selectedAsset, balance, placeOrder } = useApp();
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!selectedAsset) return null;

  const price = orderType === 'market' ? selectedAsset.price : parseFloat(limitPrice) || selectedAsset.price;
  const total = price * (parseFloat(quantity) || 0);
  const isBuy = side === 'buy';
  const canAfford = isBuy ? total <= balance : true;

  const handlePlaceOrder = () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' });
      return;
    }
    if (!canAfford) {
      setMessage({ type: 'error', text: t('insufficientBalance') });
      return;
    }

    const success = placeOrder(selectedAsset.symbol, side, orderType, qty, price);
    if (success) {
      setMessage({ type: 'success', text: t('orderSuccess') });
      setQuantity('');
      setLimitPrice('');
    } else {
      setMessage({ type: 'error', text: t('orderFailed') });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('placeOrder')} — {selectedAsset.symbol}
        </h3>
        <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('availableBalance')}: <span className="text-green-500 font-semibold">${balance.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Buy/Sell Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700">
          <button
            onClick={() => setSide('buy')}
            className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isBuy
                ? 'bg-green-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            {t('buy')}
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              !isBuy
                ? 'bg-red-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            {t('sell')}
          </button>
        </div>

        {/* Order Type */}
        <div>
          <label className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('orderType')}
          </label>
          <div className="flex gap-1 mt-1">
            {(['market', 'limit', 'stop'] as const).map(ot => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  orderType === ot
                    ? darkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : darkMode ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                {t(ot === 'market' ? 'marketOrder' : ot === 'limit' ? 'limitOrder' : 'stopOrder')}
              </button>
            ))}
          </div>
        </div>

        {/* Limit/Stop Price */}
        {orderType !== 'market' && (
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('price')}
            </label>
            <div className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
            }`}>
              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className={`text-sm bg-transparent outline-none w-full ${
                  darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('quantity')}
          </label>
          <div className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          }`}>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className={`text-sm bg-transparent outline-none w-full ${
                darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
        </div>

        {/* Total */}
        {total > 0 && (
          <div className={`flex justify-between py-2 px-3 rounded-lg ${
            darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
          }`}>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('totalValue')}</span>
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={!quantity}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            isBuy
              ? 'bg-green-600 hover:bg-green-500 text-white disabled:opacity-50'
              : 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-50'
          }`}
        >
          {isBuy ? t('buy') : t('sell')} {selectedAsset.symbol}
        </button>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
            message.type === 'success'
              ? darkMode ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'
              : darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
