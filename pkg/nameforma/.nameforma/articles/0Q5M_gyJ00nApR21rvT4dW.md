# Design Specification: Contextual Forking for Pi-Coding-Agent

## Overview
This document describes the "Contextual Forking" architectural pattern designed to manage cognitive load and information density during long-running sessions between a user and the `pi-coding-agent`.

## The Problem
1. **Chat Bloat (Parent Issue)**: Long technical discussions fill the context window with verbose text, making the agent slower, noisier, and prone to context drift or hallucinations.
2. **Ephemeral Knowledge (Artifact Issue)**: Critical technical decisions and deep-dives are buried in chat history, making them difficult to search, version, or reuse.
3. **Human Cognitive Load**: Users face "information fatigue" when presented with massive walls of technical text in the chat interface.

## The Solution: Contextual Forking
Instead of a single linear conversation, the system implements a dual-track architecture: a **Control Plane** (the chat) and a **Data Plane** (the archives).

### 1. The Control Plane (Parent Session)
- **Role**: Maintains a high-level, compact, and responsive conversational flow.
- **Behavior**: Focuses on intent, steering, and high-level decision-making.
- **Mechanism**: When a topic becomes too complex, the parent "forks" the discussion.

### 2. The Data Plane (The Forked Artifacts)
- **Role**: Stores high-fidelity, structured technical documentation.
- **Behavior**: A specialized "Architect" sub-agent is spawned to process the current session context and produce a formal document.
- **Mechanism**: 
    - Generates a unique `UUID.md` file.
    - Writes the complete technical deep-dive to the file.
    - Returns only a **concise summary** and a **file link** to the Parent session.

### 3. The "Rehydration" Loop
- When specific technical details from an archived topic are needed later, the agent can "rehydrate" its context by reading the specific `UUID.md` file.
- This allows for precision without swamping the active context window.

## User Experience (UX) Benefits
- **Multi-Modal Interaction**: 
    - **Audio**: Use the `say` command to listen to summaries, allowing for passive awareness of technical shifts.
    - **Visual/Chat**: A clean, readable stream of conversation.
    - **Deep-Dive**: Use `nvim` with folding to navigate the structured `.md` files, allowing the user to manage their own cognitive load by expanding only the necessary details.
- **Searchability**: The session's intelligence is transformed from ephemeral chat logs into a permanent, grep-able file system of technical artifacts.
