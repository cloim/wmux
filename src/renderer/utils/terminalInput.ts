export const SHIFT_ENTER_KEY_EVENT = '\x1b[13;2u';

export interface ShiftEnterKeyboardEvent {
  key: string;
  code?: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
  keyCode?: number;
}

export function getShiftEnterInput(): string {
  return SHIFT_ENTER_KEY_EVENT;
}

function isShiftEnter(e: ShiftEnterKeyboardEvent): boolean {
  return isEnterKey(e) &&
    e.shiftKey &&
    !e.ctrlKey &&
    !e.altKey;
}

export function isShiftEnterKeyEvent(e: ShiftEnterKeyboardEvent): boolean {
  return isShiftEnter(e);
}

function isEnterKey(e: ShiftEnterKeyboardEvent): boolean {
  return e.key === 'Enter' ||
    e.code === 'Enter' ||
    e.code === 'NumpadEnter' ||
    e.keyCode === 13;
}

export function shouldDeferShiftEnterUntilComposition(e: ShiftEnterKeyboardEvent): boolean {
  return isShiftEnter(e) &&
    isCompositionKeyEvent(e);
}

export function shouldHandleShiftEnter(e: ShiftEnterKeyboardEvent): boolean {
  return isShiftEnter(e) &&
    !shouldDeferShiftEnterUntilComposition(e);
}

export function extractTextBeforeDeferredShiftEnter(data: string): string | null {
  if (!/[\r\n]/.test(data)) return null;
  return data.replace(/[\r\n]/g, '');
}

export interface DeferredShiftEnterState {
  textWritten: boolean;
  lineBreakReceived: boolean;
}

export interface DeferredShiftEnterDataResult {
  textToWrite: string;
  shouldWriteShiftEnter: boolean;
  shouldKeepPending: boolean;
  nextState: DeferredShiftEnterState;
}

export function createDeferredShiftEnterState(): DeferredShiftEnterState {
  return {
    textWritten: false,
    lineBreakReceived: false,
  };
}

export function processDeferredShiftEnterData(
  data: string,
  state: DeferredShiftEnterState,
  compositionEnded = false,
): DeferredShiftEnterDataResult {
  const textToWrite = data.replace(/[\r\n]/g, '');
  const textWritten = state.textWritten || textToWrite.length > 0;
  const lineBreakReceived = state.lineBreakReceived || /[\r\n]/.test(data);
  const shouldWriteShiftEnter = textWritten && (lineBreakReceived || compositionEnded);

  return {
    textToWrite,
    shouldWriteShiftEnter,
    shouldKeepPending: !shouldWriteShiftEnter,
    nextState: shouldWriteShiftEnter
      ? createDeferredShiftEnterState()
      : { textWritten, lineBreakReceived },
  };
}

function isCompositionKeyEvent(e: ShiftEnterKeyboardEvent): boolean {
  return e.isComposing === true || e.keyCode === 229;
}
