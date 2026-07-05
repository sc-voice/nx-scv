import { describe, it, expect } from 'vitest';
import { EntityView } from '../src/entity-view.js';
import { LineRenderer } from '../src/line-renderer.js';
import { FormaField } from '../src/forma-field.js';
import {
  zenoStep,
  ZenoCoord,
  ZENO_1_ROW_TERSE,
  ZENO_1_ROW_VERBOSE,
} from '../src/navigable-view.js';

class MockEntity {
  id = { timeId: () => 'test-id' };
  asRenderData(view: EntityView) {
    const zeno = view.zenoCoord;
    if (zeno.anchorStep === ZENO_1_ROW_TERSE) {
      return [
        new FormaField('id', false, 'Entity.id', 'test-id: test entity'),
      ];
    }
    return [
      new FormaField('id', false, 'Entity.id', 'test-id'),
      new FormaField('name', false, 'Entity.name', 'test entity'),
    ];
  }
}

describe('cli-get: EntityView + LineRenderer', () => {
  it('EntityView stores and exposes zenoCoord', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_VERBOSE, zenoStep(0));

    view.zoomTo(zenoCoord);

    expect(view.zenoCoord.anchorStep).toBe(zenoCoord.anchorStep);
    expect(view.zenoCoord.pivotStep).toBe(zenoCoord.pivotStep);
  });

  it('EntityView.bodyIndent can be set and retrieved', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);

    view.setBodyIndent('    ');

    expect(view.bodyIndent).toBe('    ');
  });

  it('LineRenderer respects zenoStep for label rendering', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_VERBOSE, zenoStep(0));
    view.zoomTo(zenoCoord);

    const renderData = entity.asRenderData(view);
    const renderer = new LineRenderer({ zenoStep: ZENO_1_ROW_VERBOSE });
    const lines = renderer.render(renderData);

    expect(lines.join(' ')).toContain('Entity.id');
  });

  it('LineRenderer renders labels at ZENO_1_ROW_TERSE', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_TERSE, zenoStep(0));
    view.zoomTo(zenoCoord);

    const renderData = entity.asRenderData(view);
    const renderer = new LineRenderer({ zenoStep: ZENO_1_ROW_TERSE });
    const lines = renderer.render(renderData);

    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('test-id: test entity');
  });

  it('LineRenderer respects lines budget', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_VERBOSE, zenoStep(0));
    view.zoomTo(zenoCoord);

    const renderData = entity.asRenderData(view);
    const renderer = new LineRenderer({
      zenoStep: ZENO_1_ROW_VERBOSE,
      lines: 1,
    });
    const lines = renderer.render(renderData);

    expect(lines.length).toBeLessThanOrEqual(1);
  });

  it('LineRenderer respects lineWidth with wrapping', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_VERBOSE, zenoStep(0));
    view.zoomTo(zenoCoord);

    const renderData = entity.asRenderData(view);
    const renderer = new LineRenderer({
      zenoStep: ZENO_1_ROW_VERBOSE,
      lineWidth: 20,
    });
    const lines = renderer.render(renderData);

    lines.forEach((line) => {
      expect(
        line.replace(/\x1b\[[0-9;]*m/g, '').length,
      ).toBeLessThanOrEqual(20);
    });
  });

  it('render() respects bodyIndent parameter', () => {
    const entity = new MockEntity() as any;
    const view = new EntityView(entity);
    const zenoCoord = new ZenoCoord(ZENO_1_ROW_TERSE, zenoStep(0));
    view.zoomTo(zenoCoord);

    const renderData = entity.asRenderData(view);
    const renderer = new LineRenderer({ zenoStep: ZENO_1_ROW_TERSE });
    const lines = renderer.render(renderData, '  ');

    expect(lines[0]).toMatch(/^  /);
  });
});
