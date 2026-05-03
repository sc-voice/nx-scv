/**
 * pi-nameforma Extension
 *
 * Usage: pi --extension ./src/pi/nameforma
 *
 * Commands:
 *   /nameforma - Display "pi-nameforma CURRENT-TIME" in a top-right overlay
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { NameformaComponent } from "./nameforma-component.js";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("nameforma", {
		description: "Display pi-nameforma with current time in overlay",
		handler: async (_args, ctx: ExtensionCommandContext) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("nameforma extension requires interactive mode", "error");
				return;
			}

			await ctx.ui.custom(
				(tui, theme, _keybindings, done) => new NameformaComponent(tui, theme, done),
				{
					overlay: true,
					overlayOptions: {
						width: 80,
						anchor: "top-right",
					},
				},
			);
		},
	});
}
