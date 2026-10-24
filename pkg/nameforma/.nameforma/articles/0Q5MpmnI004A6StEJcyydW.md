# Implementation Design: Apple Text-to-Speech Extension for Pi

## Overview
This document outlines the findings and proposed implementation strategy for a Pi extension that utilizes Apple's text-to-speech capabilities to announce LLM responses.

## Integration Points
Based on the `ExtensionAPI` and `ExtensionContext` definitions, two lifecycle events are suitable for capturing assistant text:

### 1. `message_end` (Recommended)
- **Mechanism**: Fires once the assistant message is finalized.
- **Pros**: Provides complete, coherent text, resulting in much better speech prosody and naturalness. It avoids the overhead of processing every token.
- **Cons**: Slight delay between the end of the stream and the start of speech.

### 2. `message_update` (Alternative)
- **Mechanism**: Fires token-by-token during streaming.
- **Pros**: Extremely low latency; speech begins almost immediately.
- **Cons**: High complexity. Requires a buffering mechanism (e.g., a sentence-based buffer) to prevent the synthesizer from stuttering or constantly restarting on every new token.

## Implementation Strategy

### Bridging Node.js to Apple Foundation
Since the extension runs in a Node.js environment, direct access to Apple's Swift/Objective-C `AVSpeechSynthesizer` is not possible via standard TypeScript. Two paths exist:

1.  **The `say` Command (Recommended for simplicity)**:
    - Use `node:child_process` to execute the macOS system utility `say`.
    - **Implementation**: `exec('say "text to speak"')`.
    - **Complexity**: Very low.
    - **Reliability**: High for standard text.

2.  **Native Node Module (Advanced)**:
    - Create a C++ addon using N-API to interface with `AVFoundation`.
    - **Complexity**: High. Requires compilation and management of native dependencies.

## Proposed Implementation (Draft)

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default function (pi: ExtensionAPI) {
  pi.on("message_end", async (event, ctx) => {
    // Ensure we are in the TUI mode where audio is relevant
    if (ctx.mode !== "tui") return;

    const { message } = event;
    
    // Only process assistant responses
    if (message.role !== "assistant") return;

    // Extract text from content parts
    const textToSpeak = message.content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map(part => part.text)
      .join("");

    if (!textToSpeak.trim()) return;

    try {
      // Use macOS 'say' command with JSON stringify to handle escaping
      await execAsync(`say ${JSON.stringify(textToSpeak)}`);
    } catch (err) {
      ctx.ui.notify("Failed to speak response", "error");
    }
  });
}
```

## Future Enhancements
- **Mute/Unmute Toggle**: Register a command (e.g., `/speech-off`) to control the extension state.
- **Voice Selection**: Allow users to configure the voice via Pi settings or a command.
- **Sentence Buffering**: If using `message_update`, implement a regex-based buffer to detect `[.!?]` and trigger speech per sentence.
