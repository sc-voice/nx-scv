import { describe, it, expect, beforeEach, vi } from '@sc-voice/vitest';
import { NfEditor } from '../src/pi/nf-pi/nf-edit.js';
import { Forma } from '../src/forma.js';
import { ZenoCoord } from '../src/navigable-view.js';
import { FuzzyNamespace } from '../src/fuzzy-namespace.js';

describe('NfEditor', () => {
  let editor: NfEditor;
  let mockTui: any;
  let mockTheme: any;
  let doneFn: ReturnType<typeof vi.fn>;
  let mockWorld: any;
  let mockAnchor: Forma;

  beforeEach(() => {
    mockTui = {
      requestRender: vi.fn(),
    };

    mockTheme = {
      fg: (color: string, text: string) => text,
    };

    doneFn = vi.fn();

    mockWorld = {
      name: 'test-world',
      id: { timeId: () => 'world-id' },
    };

    const formaAnchor = new Forma({ name: 'test-anchor' });
    const ns = new FuzzyNamespace();
    ns.addForma(formaAnchor);
    mockAnchor = Object.create(Object.getPrototypeOf(formaAnchor));
    Object.assign(mockAnchor, formaAnchor);
    Object.defineProperty(mockAnchor, 'namespace', {
      get: () => ns,
      configurable: true
    });

    editor = new NfEditor(
      mockTui,
      mockTheme,
      doneFn,
      mockWorld,
      mockAnchor,
      null,
    );
  });

  it('initializes with provided world and anchor', () => {
    expect(editor['view'].world).toBe(mockWorld);
    expect(editor['view'].anchor).toBe(mockAnchor);
  });

  it('handleInput: escape calls done', () => {
    editor.handleInput('\x1b');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: q calls done', () => {
    editor.handleInput('q');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: Q calls done', () => {
    editor.handleInput('Q');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: accumulates characters', () => {
    editor.handleInput('z');
    expect(editor['inputBuffer']).toBe('z');
    editor.handleInput('o');
    expect(editor['inputBuffer']).toBe('');
  });

  it('handleInput: "zo" increments anchorStep', () => {
    const initialCoord = editor['view'].zenoCoord;
    const initialStep = initialCoord.anchorStep;

    editor.handleInput('z');
    editor.handleInput('o');

    const newCoord = editor['view'].zenoCoord;
    expect(newCoord.anchorStep).toBe(initialStep + 1);
  });

  it('handleInput: "zo" respects MAX_ZENO_STEP', () => {
    // Set to max
    const maxCoord = new ZenoCoord(
      ZenoCoord.MAX_ZENO_STEP as any,
      0 as any,
    );
    editor['view'].zoomTo(maxCoord);

    const coordBefore = editor['view'].zenoCoord;
    editor.handleInput('z');
    editor.handleInput('o');

    const coordAfter = editor['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(coordBefore.anchorStep);
  });

  it('handleInput: "zc" decrements anchorStep', () => {
    // First zoom in to have something to zoom out from
    editor.handleInput('z');
    editor.handleInput('o');

    const coordBefore = editor['view'].zenoCoord;
    const stepBefore = coordBefore.anchorStep;

    editor.handleInput('z');
    editor.handleInput('c');

    const coordAfter = editor['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(stepBefore - 1);
  });

  it('handleInput: "zc" respects minimum anchorStep', () => {
    // Already at 0
    const coordBefore = editor['view'].zenoCoord;
    editor.handleInput('z');
    editor.handleInput('c');

    const coordAfter = editor['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(coordBefore.anchorStep);
  });

  it('handleInput: invalid sequence resets buffer', () => {
    editor.handleInput('x');
    expect(editor['inputBuffer']).toBe('');
  });

  it('handleInput: buffer overflow resets buffer', () => {
    editor.handleInput('z');
    editor.handleInput('o');
    editor.handleInput('x');
    expect(editor['inputBuffer']).toBe('');
  });

  it('has independent view state', () => {
    const editorDetail = editor['view'].detail;
    const expectedSharedDetail = 0; // Should be independent

    editor.handleInput('z');
    editor.handleInput('o');

    expect(editor['view'].detail).not.toBe(expectedSharedDetail);
  });
});
