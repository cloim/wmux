import { describe, expect, it } from 'vitest';
import {
  createDeferredShiftEnterState,
  extractTextBeforeDeferredShiftEnter,
  getShiftEnterInput,
  processDeferredShiftEnterData,
  shouldDeferShiftEnterUntilComposition,
  shouldHandleShiftEnter,
} from '../terminalInput';

describe('getShiftEnterInput', () => {
  it('uses the Shift+Enter key-event sentinel', () => {
    expect(getShiftEnterInput()).toBe('\x1b[13;2u');
  });
});

describe('shouldHandleShiftEnter', () => {
  it('handles plain Shift+Enter', () => {
    expect(shouldHandleShiftEnter({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      isComposing: false,
    })).toBe(true);
  });

  it('does not steal Shift+Enter while IME composition is active', () => {
    expect(shouldHandleShiftEnter({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      isComposing: true,
    })).toBe(false);
  });

  it('does not steal IME Process Enter events', () => {
    expect(shouldHandleShiftEnter({
      key: 'Process',
      code: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      keyCode: 229,
    })).toBe(false);
  });
});

describe('shouldDeferShiftEnterUntilComposition', () => {
  it('defers Shift+Enter while IME composition is active', () => {
    expect(shouldDeferShiftEnterUntilComposition({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      isComposing: true,
    })).toBe(true);
  });

  it('defers IME process key events for Shift+Enter', () => {
    expect(shouldDeferShiftEnterUntilComposition({
      key: 'Process',
      code: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      keyCode: 229,
    })).toBe(true);
  });

  it('does not defer normal Shift+Enter', () => {
    expect(shouldDeferShiftEnterUntilComposition({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      isComposing: false,
    })).toBe(false);
  });

  it('does not defer non-Enter IME process key events', () => {
    expect(shouldDeferShiftEnterUntilComposition({
      key: 'Process',
      code: 'KeyA',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      keyCode: 229,
    })).toBe(false);
  });
});

describe('extractTextBeforeDeferredShiftEnter', () => {
  it('strips a leading newline that arrived before committed IME text', () => {
    expect(extractTextBeforeDeferredShiftEnter('\r녕')).toBe('녕');
  });

  it('strips a trailing newline that arrived after committed IME text', () => {
    expect(extractTextBeforeDeferredShiftEnter('녕\r')).toBe('녕');
  });

  it('strips line feeds from browser textarea defaults', () => {
    expect(extractTextBeforeDeferredShiftEnter('\n녕')).toBe('녕');
  });

  it('returns an empty string for a newline-only deferred input', () => {
    expect(extractTextBeforeDeferredShiftEnter('\r')).toBe('');
  });

  it('ignores composition text without a newline', () => {
    expect(extractTextBeforeDeferredShiftEnter('녕')).toBeNull();
  });
});

describe('processDeferredShiftEnterData', () => {
  it('writes Shift+Enter after committed IME text when composition already ended', () => {
    const result = processDeferredShiftEnterData('녕', createDeferredShiftEnterState(), true);

    expect(result.textToWrite).toBe('녕');
    expect(result.shouldWriteShiftEnter).toBe(true);
    expect(result.shouldKeepPending).toBe(false);
  });

  it('waits for xterm Enter after committed IME text before writing Shift+Enter', () => {
    let state = createDeferredShiftEnterState();

    const textResult = processDeferredShiftEnterData('녕', state);
    expect(textResult.textToWrite).toBe('녕');
    expect(textResult.shouldWriteShiftEnter).toBe(false);
    expect(textResult.shouldKeepPending).toBe(true);

    state = textResult.nextState;
    const enterResult = processDeferredShiftEnterData('\r', state);
    expect(enterResult.textToWrite).toBe('');
    expect(enterResult.shouldWriteShiftEnter).toBe(true);
    expect(enterResult.shouldKeepPending).toBe(false);
  });

  it('buffers xterm Enter until committed IME text arrives when Enter is emitted first', () => {
    let state = createDeferredShiftEnterState();

    const enterResult = processDeferredShiftEnterData('\r', state);
    expect(enterResult.textToWrite).toBe('');
    expect(enterResult.shouldWriteShiftEnter).toBe(false);
    expect(enterResult.shouldKeepPending).toBe(true);

    state = enterResult.nextState;
    const textResult = processDeferredShiftEnterData('녕', state, true);
    expect(textResult.textToWrite).toBe('녕');
    expect(textResult.shouldWriteShiftEnter).toBe(true);
    expect(textResult.shouldKeepPending).toBe(false);
  });

  it('handles xterm data containing both browser newline and committed IME text', () => {
    const result = processDeferredShiftEnterData('\r녕', createDeferredShiftEnterState());

    expect(result.textToWrite).toBe('녕');
    expect(result.shouldWriteShiftEnter).toBe(true);
    expect(result.shouldKeepPending).toBe(false);
  });
});
