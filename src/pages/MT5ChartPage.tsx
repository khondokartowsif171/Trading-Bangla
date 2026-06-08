import MT5ChartTerminal from '@/components/MT5ChartTerminal';
import { useApp } from '@/context/AppContext';

export default function MT5ChartPage() {
  const { darkMode } = useApp();
  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <MT5ChartTerminal />
    </div>
  );
}
