import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Focusable, TUI } from "@mariozechner/pi-tui";

export class NameformaComponent implements Focusable {
	focused = false;
	private lines: string[] = [];
	private intervalId: NodeJS.Timeout | null = null;

	constructor(public tui: TUI, private theme: Theme, private done: () => void) {
		this.update();
		this.startTimer();
	}

	private update() {
		const now = new Date();
		const timeStr = now.toLocaleTimeString();
		const header = this.theme.fg("accent", `pi-nameforma ${timeStr}`);

		const randomLines = this.generateRandomLines();
		this.lines = [header, ...randomLines];
	}

	private generateRandomLines(): string[] {
		const count = Math.floor(Math.random() * 6); // 0-5 random lines
		const lines: string[] = [];
		for (let i = 0; i < count; i++) {
			const randomNum = Math.floor(Math.random() * 1000000);
			lines.push(`  ${randomNum}`);
		}
		return lines;
	}

	private startTimer() {
		this.intervalId = setInterval(() => {
			this.update();
			this.tui.requestRender();
		}, 1000);
	}

	render(_width: number): string[] {
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

	invalidate(): void {
		// No-op for simple text rendering
	}

	dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	handleInput(data: string): void {
		if (data === "\x1b" || data === "q" || data === "Q") {
			this.done();
		}
	}
}
