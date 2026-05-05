import type { Theme } from "@mariozechner/pi-coding-agent";
import type { IView, IRenderable, RenderDetail, RenderData } from '../../renderable.js';
import type { Forma } from '../../forma.js';
import type { World } from '../../world.js';
import { Task } from '../../task.js';

export class NfWidget implements IView {
	private lines: string[] = [];
	private intervalId: NodeJS.Timeout | null = null;
	public anchor: IRenderable | null = null;
	public pivot: Forma | null = null;
	public detail: RenderDetail | number = 0;

	constructor(private theme: Theme, private key: string, private onInvalidate: () => void, private world?: World) {
		this.loadFocusedTaskAsAnchor();
		this.update();
		this.startTimer();
	}

	private loadFocusedTaskAsAnchor(): void {
		if (this.anchor || !this.world) return;

		try {
			const focusedForma = this.world.focusedForma('task');
			if (focusedForma) {
				const task = this.world.loadEntity(Task, focusedForma.formaId.base64);
				if (task) {
					this.anchor = task;
				}
			}
		} catch (error) {
			// World not available or no focused task
		}
	}

	private update() {
		const now = new Date();
		const timeStr = now.toLocaleTimeString();
		const detailStr = (this.detail as number).toFixed(1);
		const header = this.theme.fg("accent", `nf-widget ${timeStr} detail:${detailStr}`);

		const contentLines = this.renderContent();
		this.lines = [header, ...contentLines];
	}

	private renderContent(): string[] {
		if (!this.anchor) {
			return ['(no anchor)'];
		}

		const renderData = this.anchor.asRenderData(this.detail, this.pivot ?? undefined);
		return this.renderDataToLines(renderData);
	}

	private renderDataToLines(data: RenderData, indent: string = ''): string[] {
		const lines: string[] = [];

		if (typeof data === 'string') {
			lines.push(`${indent}${data}`);
		} else if (typeof data === 'number') {
			lines.push(`${indent}${data}`);
		} else if (typeof data === 'boolean') {
			lines.push(`${indent}${data}`);
		} else if (Array.isArray(data)) {
			data.forEach(item => {
				lines.push(...this.renderDataToLines(item, indent));
			});
		} else if (typeof data === 'object') {
			Object.entries(data).forEach(([key, value]) => {
				if (typeof value === 'object' && !Array.isArray(value)) {
					lines.push(`${indent}${key}:`);
					lines.push(...this.renderDataToLines(value, indent + '  '));
				} else {
					lines.push(`${indent}${key}: ${this.valueToString(value)}`);
				}
			});
		}

		return lines;
	}

	private valueToString(value: any): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return value.toString();
		if (typeof value === 'boolean') return value.toString();
		if (Array.isArray(value)) return `[${value.length} items]`;
		if (typeof value === 'object') return '{...}';
		return String(value);
	}

	private startTimer() {
		this.intervalId = setInterval(() => {
			this.update();
			this.onInvalidate();
		}, 1000);
	}

	getContent(): string[] {
		return this.lines.map((line, index) => {
			if (index === 0) {
				return `╭ ${line}`;
			} else if (index === this.lines.length - 1) {
				return `╰ ${line}`;
			} else {
				return `│ ${line}`;
			}
		});
	}

	setAnchor(value: IRenderable): void {
		this.anchor = value;
		this.update();
		this.onInvalidate();
	}

	setPivot(value: Forma): void {
		this.pivot = value;
		this.update();
		this.onInvalidate();
	}

	zoom(detailIncrement: number): void {
		this.detail = (this.detail as number) + detailIncrement;
		this.update();
		this.onInvalidate();
	}

	observe(): void {
		// Widget is already observing via the timer
	}

	dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
