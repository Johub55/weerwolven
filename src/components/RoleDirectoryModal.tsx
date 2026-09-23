import React, { useState } from 'react';
import { ALL_ROLES } from '../utils/roles';
import { RoleId } from '../types/game';
import { X, BookOpen, Moon, Shield, Sparkles, HelpCircle } from 'lucide-react';

interface RoleDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleDirectoryModal: React.FC<RoleDirectoryModalProps> = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<RoleId>('weerwolf');

  if (!isOpen) return null;

  const rolesList = Object.values(ALL_ROLES);
  const activeRole = ALL_ROLES[selectedRole] || ALL_ROLES.burger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-cinzel font-bold text-white">
              Wakkerdam Rol-Encyclopedie & Spelregels
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Left Column: Role List */}
          <div className="border-r border-slate-800 p-3 overflow-y-auto max-h-[35vh] md:max-h-[70vh] space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Alle Rollen ({rolesList.length})
            </p>
            {rolesList.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition ${
                  selectedRole === r.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-lg">{r.icon}</span>
                <span className="truncate">{r.dutchName}</span>
                {r.team === 'werewolves' && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                    Wolf
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right Column: Role Details */}
          <div className="col-span-2 p-6 overflow-y-auto max-h-[55vh] md:max-h-[70vh] space-y-5 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center text-4xl shadow-lg">
                {activeRole.icon}
              </div>
              <div>
                <h3 className="text-2xl font-cinzel font-bold text-white flex items-center gap-2">
                  <span>{activeRole.dutchName}</span>
                  <span className="text-sm font-sans font-normal text-slate-400">({activeRole.name})</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2.5 py-0.5 text-xs rounded-full border ${
                      activeRole.team === 'werewolves'
                        ? 'bg-red-950/60 text-red-300 border-red-500/40'
                        : activeRole.team === 'lovers'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : activeRole.team === 'solo'
                        ? 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-500/40'
                        : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    Team:{' '}
                    {activeRole.team === 'werewolves'
                      ? 'Weerwolven'
                      : activeRole.team === 'lovers'
                      ? 'Geliefden'
                      : activeRole.team === 'solo'
                      ? 'Solitair'
                      : 'Dorp'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" />
                    {activeRole.nightOrder > 0
                      ? `Nachtvolgorde #${activeRole.nightOrder} (${activeRole.wakesFirstNightOnly ? 'Alleen nacht 1' : 'Elke nacht'})`
                      : 'Slaapt altijd'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-amber-400 mb-1">
                  Beschrijving & Doel
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">{activeRole.description}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-indigo-400 mb-1">
                  Spelleider Nachtscript (Tekst om voor te lezen)
                </h4>
                <div className="space-y-1.5 mt-2">
                  {activeRole.scriptLinesDutch.map((line, idx) => (
                    <p key={idx} className="text-xs text-slate-200 italic bg-black/30 p-2 rounded-lg border border-white/5">
                      "{line}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>💡 Tip: Klik op een rol links om de speciale nachtactie en spelleidertekst te bekijken.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
