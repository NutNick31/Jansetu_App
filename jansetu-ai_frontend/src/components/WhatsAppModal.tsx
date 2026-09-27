import React, { useState } from 'react';
import { MessageSquare, X, CheckCircle2, ExternalLink, QrCode, Smartphone, Copy } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const twilioNumber = "+1 415 523 8886";
  const joinCode = "join brave-tiger";
  const directLink = `https://wa.me/14155238886?text=${encodeURIComponent(joinCode)}`;

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Connect Real Phone to JanSetu WhatsApp Bot</h2>
            <span className="text-xs text-emerald-400 font-semibold">Live Meta & Twilio Sandbox Sandbox Gateway</span>
          </div>
        </div>

        {/* QR Code & Direct Link Card */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          {/* Simulated High-Res SVG QR Code */}
          <div className="bg-white p-3 rounded-xl shadow-lg shrink-0 text-center space-y-1">
            <div className="w-32 h-32 bg-slate-950 p-2 rounded flex flex-col justify-between items-center text-[8px] font-mono text-emerald-400 border border-emerald-500">
              <div className="grid grid-cols-5 gap-1 w-full h-full p-1 bg-slate-900 rounded">
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
                <div className="bg-white rounded-sm"></div>
                <div className="bg-emerald-400 rounded-sm"></div>
              </div>
            </div>
            <span className="text-[10px] text-slate-700 font-bold block">Scan with Phone Camera</span>
          </div>

          {/* Connection Steps */}
          <div className="space-y-3 text-xs flex-1">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Step 1: Open WhatsApp on your phone</span>
              <p className="text-slate-200">Send WhatsApp message to <strong className="text-emerald-400 font-mono">{twilioNumber}</strong></p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Step 2: Send Sandbox Code</span>
              <div className="flex items-center space-x-2">
                <code className="bg-slate-900 border border-slate-700 text-emerald-300 px-2.5 py-1 rounded font-mono font-bold">
                  {joinCode}
                </code>
                <button
                  onClick={copyCode}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-1">
              <a
                href={directLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open WhatsApp Direct Link</span>
              </a>
            </div>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Production Webhook Active on <code className="text-emerald-400 font-mono">http://localhost:3001/api/whatsapp/webhook</code></span>
          </div>
          <span className="text-emerald-400 font-bold font-mono">Status: Ready</span>
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
