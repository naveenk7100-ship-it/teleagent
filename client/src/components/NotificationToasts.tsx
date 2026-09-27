import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToasts: React.FC = () => {
  const { notifications, removeNotification } = useApp();

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {notifications.map(n => {
        let Icon = CheckCircle2;
        let border = 'border-emerald-500/30';
        let bg = 'bg-slate-900/95';
        let text = 'text-emerald-400';

        if (n.type === 'error') {
          Icon = AlertCircle;
          border = 'border-rose-500/30';
          text = 'text-rose-400';
        } else if (n.type === 'warning') {
          Icon = AlertTriangle;
          border = 'border-amber-500/30';
          text = 'text-amber-400';
        } else if (n.type === 'info') {
          Icon = Info;
          border = 'border-sky-500/30';
          text = 'text-sky-400';
        }

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${border} ${bg} shadow-2xl backdrop-blur animate-slide-up text-sm`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${text}`} />
            <div className="flex-1">
              <div className="font-semibold text-slate-100">{n.title}</div>
              {n.message && <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
