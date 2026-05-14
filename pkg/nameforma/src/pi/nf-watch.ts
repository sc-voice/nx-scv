import { fileURLToPath } from 'node:url';
import { Component, TUI } from '@earendil-works/pi-tui';
import { ProcessTerminal } from '@earendil-works/pi-tui/dist/terminal.js';

export class WatchComponent implements Component {
  private time: string = '';

  constructor() {
    this.updateTime();
    // Start an interval to update the time every second
    setInterval(() => this.updateTime(), 1000);
  }

  private updateTime(): void {
    this.time = new Date().toLocaleTimeString();
    this.invalidate(); // Use invalidate() as defined in the interface
  }

  render(width: number): string[] {
    // The interface requires returning string[]
    return [`nf coming soon ${this.time}`];
  }

  invalidate(): void {
    // In a real app, this would trigger a TUI requestRender.
    // For this simple script, we's just relying on the process staying alive.
  }

  handleInput?(data: string): void {}
  wantsKeyRelease?: boolean;
}

// Entry point to run this as a standalone process
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  const watchComp = new WatchComponent();
  tui.addChild(watchComp);

  terminal.start(
    (data) => {
      // Very basic input handling for the demo
      if (data === '\u0003') {
        // Ctrl+C
        process.exit();
      }
    },
    () => {},
  );

  tui.start();

  // Simple loop to trigger re-renders since we don't have a real event loop here
  setInterval(() => {
    terminal.write('\r\x1b[K'); // Clear line
    const lines = watchComp.render(terminal.columns);
    lines.forEach((line) => terminal.write(line + '\n'));
  }, 1000);

  process.on('SIGINT', () => {
    terminal.stop();
    process.exit();
  });
}
