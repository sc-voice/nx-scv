import { describe, it, expect, beforeEach, vi } from '@sc-voice/vitest';
import { NfPrompt } from '../src/pi/nf-pi/nf-prompt.js';
import { Forma } from '../src/forma.js';
import { ZenoCoord } from '../src/navigable-view.js';
import { FuzzyNamespace } from '../src/fuzzy-namespace.js';

describe('NfPrompt', () => {
  let prompt: NfPrompt;
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
    mockAnchor.namespace = () => ns;

    prompt = new NfPrompt(
      mockTui,
      mockTheme,
      doneFn,
      mockWorld,
      mockAnchor,
      null,
    );
  });

  it('initializes with provided world and anchor', () => {
    expect(prompt['view'].world).toBe(mockWorld);
    expect(prompt['view'].anchor).toBe(mockAnchor);
  });

  it('handleInput: escape calls done', () => {
    prompt.handleInput('\x1b');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: q calls done', () => {
    prompt.handleInput('q');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: Q calls done', () => {
    prompt.handleInput('Q');
    expect(doneFn).toHaveBeenCalled();
  });

  it('handleInput: accumulates characters', () => {
    prompt.handleInput('z');
    expect(prompt['inputBuffer']).toBe('z');
    prompt.handleInput('o');
    expect(prompt['inputBuffer']).toBe('');
  });

  it('handleInput: "zo" increments anchorStep', () => {
    const initialCoord = prompt['view'].zenoCoord;
    const initialStep = initialCoord.anchorStep;

    prompt.handleInput('z');
    prompt.handleInput('o');

    const newCoord = prompt['view'].zenoCoord;
    expect(newCoord.anchorStep).toBe(initialStep + 1);
  });

  it('handleInput: "zo" respects MAX_ZENO_STEP', () => {
    // Set to max
    const maxCoord = new ZenoCoord(
      ZenoCoord.MAX_ZENO_STEP as any,
      0 as any,
    );
    prompt['view'].zoomTo(maxCoord);

    const coordBefore = prompt['view'].zenoCoord;
    prompt.handleInput('z');
    prompt.handleInput('o');

    const coordAfter = prompt['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(coordBefore.anchorStep);
  });

  it('handleInput: "zc" decrements anchorStep', () => {
    // First zoom in to have something to zoom out from
    prompt.handleInput('z');
    prompt.handleInput('o');

    const coordBefore = prompt['view'].zenoCoord;
    const stepBefore = coordBefore.anchorStep;

    prompt.handleInput('z');
    prompt.handleInput('c');

    const coordAfter = prompt['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(stepBefore - 1);
  });

  it('handleInput: "zc" respects minimum anchorStep', () => {
    // Already at 0
    const coordBefore = prompt['view'].zenoCoord;
    prompt.handleInput('z');
    prompt.handleInput('c');

    const coordAfter = prompt['view'].zenoCoord;
    expect(coordAfter.anchorStep).toBe(coordBefore.anchorStep);
  });

  it('handleInput: invalid sequence resets buffer', () => {
    prompt.handleInput('x');
    expect(prompt['inputBuffer']).toBe('');
  });

  it('handleInput: buffer overflow resets buffer', () => {
    prompt.handleInput('z');
    prompt.handleInput('o');
    prompt.handleInput('x');
    expect(prompt['inputBuffer']).toBe('');
  });

  it('has independent view state', () => {
    const promptDetail = prompt['view'].detail;
    const expectedSharedDetail = 0; // Should be independent

    prompt.handleInput('z');
    prompt.handleInput('o');

    expect(prompt['view'].detail).not.toBe(expectedSharedDetail);
  });
});
