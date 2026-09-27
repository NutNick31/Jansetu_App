import React from 'react';
import { MessageSquare, X, ExternalLink } from 'lucide-react';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const botUsername = 'jansetu_ai_bot';
  const directLink = `https://t.me/${botUsername}`;
  // QR encodes the deep-link so phone camera can jump straight into the bot chat.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=ffffff&color=0f172a&data=${encodeURIComponent(directLink)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Connect Real Phone to JanSetu Telegram Bot</h2>
            <span className="text-xs text-sky-400 font-semibold">Live Telegram Bot API · @{botUsername}</span>
          </div>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-xl shadow-lg shrink-0">
            <img src={qrUrl} alt={`QR code linking to @${botUsername}`} className="w-40 h-40" />
            <span className="text-[10px] text-slate-700 font-bold block text-center mt-1">Scan with Phone Camera</span>
          </div>

          <div className="space-y-3 text-xs flex-1">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Step 1: Open Telegram on your phone</span>
              <p className="text-slate-200">Search for <strong className="text-sky-400 font-mono">@{botUsername}</strong> or scan the QR code.</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Step 2: Tap <strong>Start</strong></span>
              <p className="text-slate-200">The bot replies with a welcome message. From then on you can send any complaint in any Indian language, text or voice.</p>
            </div>

            <div className="pt-1">
              <a
                href={directLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Telegram Direct Link</span>
              </a>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></span>
            <span>Production webhook active at <code className="text-sky-400 font-mono">/api/telegram/webhook</code></span>
          </div>
          <span className="text-sky-400 font-bold font-mono">Status: Ready</span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2 rounded-xl text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
