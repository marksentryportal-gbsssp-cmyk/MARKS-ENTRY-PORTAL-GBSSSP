import React from 'react';
import { Check, UploadCloud, CheckCircle2, ShieldCheck } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Upload File', icon: UploadCloud },
    { number: 2, title: 'Preview & Validate', icon: ShieldCheck },
    { number: 3, title: 'Confirm & Import', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-slate-50/90 text-xs">
      {steps.map((step, idx) => {
        const isDone = currentStep > step.number;
        const isCurrent = currentStep === step.number;

        return (
          <React.Fragment key={step.number}>
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                  isDone
                    ? 'bg-teal-700 text-white'
                    : isCurrent
                    ? 'bg-[#0f766e] text-white ring-2 ring-teal-300'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.number}
              </div>
              <span
                className={`font-semibold tracking-tight ${
                  isCurrent
                    ? 'text-[#0f766e]'
                    : isDone
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 sm:mx-6 transition-colors ${
                  currentStep > idx + 1 ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
