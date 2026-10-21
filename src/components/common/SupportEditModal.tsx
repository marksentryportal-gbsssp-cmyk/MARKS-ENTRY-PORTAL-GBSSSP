import React, { useState } from 'react';
import { X, MessageCircle, Plus, Trash2, Check } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

export const SupportEditModal: React.FC = () => {
  const {
    isSupportEditOpen,
    setIsSupportEditOpen,
    supportContact,
    updateSupportNumbers,
  } = usePortal();

  const [phone1, setPhone1] = useState(supportContact.numbers[0] || '+91 94350 12345');
  const [phone2, setPhone2] = useState(supportContact.numbers[1] || '+91 88760 98765');
  const [savedMessage, setSavedMessage] = useState(false);

  if (!isSupportEditOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupportNumbers([phone1.trim(), phone2.trim()]);
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      setIsSupportEditOpen(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <MessageCircle className="w-4 h-4 text-amber-500" />
            <span>Edit WhatsApp Support Contacts</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSupportEditOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs text-slate-700">
          <p className="text-slate-500 leading-relaxed">
            Update the two official WhatsApp technical support contact numbers displayed at the bottom of the navigation sidebar.
          </p>

          <div>
            <label className="font-semibold block mb-1 text-slate-800">
              Support Line 1:
            </label>
            <input
              type="text"
              value={phone1}
              onChange={(e) => setPhone1(e.target.value)}
              placeholder="+91 94350 XXXXX"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-800">
              Support Line 2:
            </label>
            <input
              type="text"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
              placeholder="+91 88760 XXXXX"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSupportEditOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0f766e] hover:bg-teal-800 rounded-md transition-colors shadow-xs"
            >
              {savedMessage ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Contacts</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
