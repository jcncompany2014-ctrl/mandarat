import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Screen = 'dashboard' | 'grid' | 'detail' | 'today' | 'stats' | 'settings';

export type EditorTarget =
  | { kind: 'center' }
  | { kind: 'theme'; ti: number }
  | { kind: 'action'; ti: number; ai: number };

interface UICtx {
  screen: Screen;
  ti: number;
  go: (screen: Screen, ti?: number) => void;

  sheet: { ti: number; ai: number } | null;
  openAction: (ti: number, ai: number) => void;
  closeSheet: () => void;

  focus: { ti: number; ai: number } | null;
  startFocus: (ti: number, ai: number) => void;
  closeFocus: () => void;

  quick: boolean;
  openQuick: () => void;
  closeQuick: () => void;

  celebrate: boolean;
  fireCelebrate: () => void;
  closeCelebrate: () => void;

  editor: EditorTarget | null;
  openEditor: (e: EditorTarget) => void;
  closeEditor: () => void;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [ti, setTi] = useState(0);
  const [sheet, setSheet] = useState<{ ti: number; ai: number } | null>(null);
  const [focus, setFocus] = useState<{ ti: number; ai: number } | null>(null);
  const [quick, setQuick] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);

  const go = useCallback((s: Screen, nextTi = 0) => {
    setScreen(s);
    setTi(nextTi);
  }, []);

  const openAction = useCallback((t: number, a: number) => setSheet({ ti: t, ai: a }), []);
  const startFocus = useCallback((t: number, a: number) => {
    setSheet(null);
    setFocus({ ti: t, ai: a });
  }, []);

  const value = useMemo<UICtx>(
    () => ({
      screen, ti, go,
      sheet, openAction, closeSheet: () => setSheet(null),
      focus, startFocus, closeFocus: () => setFocus(null),
      quick, openQuick: () => setQuick(true), closeQuick: () => setQuick(false),
      celebrate, fireCelebrate: () => setCelebrate(true), closeCelebrate: () => setCelebrate(false),
      editor, openEditor: setEditor, closeEditor: () => setEditor(null),
    }),
    [screen, ti, go, sheet, openAction, startFocus, focus, quick, celebrate, editor],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI must be used within UIProvider');
  return c;
}
