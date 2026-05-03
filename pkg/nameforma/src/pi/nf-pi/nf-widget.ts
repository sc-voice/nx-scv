import type { Theme } from "@mariozechner/pi-coding-agent";

export class NfWidget {
	private lines: string[] = [];
	private intervalId: NodeJS.Timeout | null = null;

	constructor(private theme: Theme, private key: string, private onInvalidate: () => void) {
		this.update();
		this.startTimer();
	}

	private update() {
		const now = new Date();
		const timeStr = now.toLocaleTimeString();
		const header = this.theme.fg("accent", `nf-widget ${timeStr}`);

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

	dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
