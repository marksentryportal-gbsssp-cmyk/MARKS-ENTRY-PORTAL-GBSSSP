import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 py-4 px-6 border-t border-slate-200 text-center select-none bg-transparent">
      <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">
        Gopinath Bordoloi Sr. Sec. School &copy; {currentYear}
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5">
        Assam State School Education Board, Div-I (ASSEB-DI) &bull; School Code: 06H1003
      </p>
    </footer>
  );
};
