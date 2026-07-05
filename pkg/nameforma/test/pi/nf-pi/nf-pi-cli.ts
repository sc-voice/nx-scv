import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { NfExtensionCommand } from '../../../src/pi/nf-pi/nf-pi-cli.js';
import { NfSession } from '../../../src/pi/nf-pi/nf-session.js';
import type { NfWatch } from '../../../src/pi/nf-pi/nf-watch.js';
import { ZenoCoord } from '../../../src/navigable-view.js';

// Mock NfSession
vi.mock('../../../src/pi/nf-pi/nf-session.js', () => ({
  NfSession: {
    shared: {
      view: {
        detail: 0.5,
        setMaxLines: vi.fn(),
        setDetail: vi.fn(),
        zoomTo: vi.fn(),
      },
      watchInstance: null,
    },
  },
}));

// Mock NfWatch
vi.mock('../../../src/pi/nf-pi/nf-watch.js', () => {
  class MockNfWatch {
    constructor(ctx: any) {
      this.ctx = ctx;
    }
    ctx: any;
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
  }
  return { NfWatch: MockNfWatch };
});

// Mock NameFormaTheme
vi.mock('../../../src/nameforma-theme.js', () => ({
  NameFormaTheme: {
    load: vi.fn().mockReturnValue({
      nfBoundary: (str: string) => `[BOUNDARY] ${str}`,
      nfText: (str: string) => str,
    }),
  },
}));

describe('NfExtensionCommand', () => {
  let mockCtx: ExtensionCommandContext;
  let notifyMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    notifyMock = vi.fn();
    mockCtx = {
      hasUI: true,
      ui: {
        notify: notifyMock,
      },
    } as any;
    NfSession.shared.watchInstance = null;
  });

  describe('constructor and initialization', () => {
    it('creates instance with valid context', () => {
      const cmd = new NfExtensionCommand(mockCtx);
      expect(cmd).toBeInstanceOf(NfExtensionCommand);
    });

    it('fails if context has no UI', () => {
      const noUiCtx = {
        hasUI: false,
        ui: { notify: vi.fn() },
      } as any;
      const cmd = new NfExtensionCommand(noUiCtx);
      expect(noUiCtx.ui.notify).toHaveBeenCalledWith(
        'nameforma extension requires interactive mode',
        'error',
      );
    });
  });

  describe('watch command', () => {
    it('parses watch with --lines option', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      await cmd.parse('watch --lines 5');

      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('detail:'),
        'warning',
      );
    });

    it('parses watch with --lines and detail', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      await cmd.parse('watch --lines 10@0.75');

      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('detail:'),
        'warning',
      );
    });

    it('rejects invalid --lines with error notification', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      const result = await cmd.parse('watch --lines invalid');
      expect(result).toBeDefined();
      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('--lines:invalid'),
        'error',
      );
    });

    it('rejects detail outside [0, 1] with error notification', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      const result = await cmd.parse('watch --lines 5@1.5');
      expect(result).toBeDefined();
      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('line detail must be between 0 and 1'),
        'error',
      );
    });

    it('starts watch when not running', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      await cmd.parse('watch');

      // Called with options warning first, then watch started
      const calls = notifyMock.mock.calls;
      expect(calls.some((c: any) => c[0].includes('options:'))).toBe(true);
      expect(
        calls.some((c: any) => c[0] === 'NameForma watch started'),
      ).toBe(true);
    });

    it('stops watch with --quit', async () => {
      const cmd = new NfExtensionCommand(mockCtx);

      // Start watch first
      await cmd.parse('watch');
      const startCalls = notifyMock.mock.calls;
      expect(
        startCalls.some((c: any) => c[0] === 'NameForma watch started'),
      ).toBe(true);

      // Reset mock to check stop call
      notifyMock.mockClear();

      // Quit watch
      await cmd.parse('watch --quit');
      expect(notifyMock).toHaveBeenCalledWith(
        'NameForma watch stopped',
        'info',
      );
    });
  });

  describe('test command', () => {
    it('executes test diagnostic', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      await cmd.parse('test default');

      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('[BOUNDARY] TEST BEGIN'),
        'info',
      );
      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('[BOUNDARY] TEST END'),
        'info',
      );
      expect(notifyMock).toHaveBeenCalledWith(
        expect.stringContaining('default'),
        'info',
      );
    });

    it('executes test with "more" variant', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      await cmd.parse('test more');

      const output = notifyMock.mock.calls
        .flatMap((call) => call[0])
        .join('\n');

      expect(output).toContain('one');
      expect(output).toContain('two');
      expect(output).toContain('three');
    });
  });

  describe('command error handling', () => {
    it('throws on unknown command', async () => {
      const cmd = new NfExtensionCommand(mockCtx);
      const result = await cmd.parse('unknown');
      expect(result).toBeDefined();
      expect(notifyMock).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });
});
