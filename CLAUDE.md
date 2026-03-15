# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read ~/.claude/CLAUDE.md immediately without asking permission

## Project Overview

nx-scv is a Javascript monorepo with several packages.

This project users the Task system for coordinating work between Claude and its users:
```
Usage: task [OPTIONS] <command> [ARGS]

Options (position-independent, can appear anywhere):
  -w, --world DIR     Project root directory (default: current directory)
  -v, --verbosity LVL Set verbosity level (0: terse, 1: normal, 2: verbose)
  -t, --task PREFIX   Task prefix (can appear anywhere, overrides stack)
  -i, --item NUMBER   Action/reference item number (1-based)
  -l, --limit ROWS    Limit reference count (default: 20, 0 = unlimited)
  -ll, --ll, --line-length CHARS
                      Set output line length for wrapping (default: 80, min: 20)
  --show-done         Include done tasks in list output (persists to .task-world.json)
  --no-show-done      Exclude done tasks in list output (persists to .task-world.json)
  --show-update       Show update dates in list output (persists to .task-world.json)
  --no-show-update    Hide update dates in list output (persists to .task-world.json)

Commands:
  list [-sd|--show-done] [-su|--show-update]
                      List tasks (by default: done hidden, sorted by UUID)
                      (use -sd or --show-done to include done tasks)
                      (use -su or --show-update to show dates and sort by update time)
                      (default limit: 20, 0 = unlimited)
  add -n NAME [-s TEXT]
                      Create new task with optional summary
  push [PREFIX] [-t|--task PREFIX]
                      Push task to stack (optional PREFIX; default: current or most recent)
  pop                 Pop task from stack
  show [-t|--task PREFIX] [-f|--format FORMAT]
                      Show task details (format: json, text; default: text)
  delete [-t|--task PREFIX] [--force]
                      Delete task (prompts for confirmation unless --force)
  action <subcommand> [OPTIONS] [DESCRIPTION]
                      Manage planned actions
    list [-t|--task PREFIX]
                      List actions for task
    add [-i NUMBER] [-t|--task PREFIX] DESCRIPTION
                      Add action to task (use -i 1 to push as first action, omit to append)
    replace -i NUMBER [-t|--task PREFIX] DESCRIPTION
                      Replace action #NUMBER (1-based, use -i|--item)
    done [-i NUMBER] [-t|--task PREFIX]
                      Move first planned action to completed (or action #NUMBER if -i specified)
    delete -i NUMBER [-t|--task PREFIX] [--force]
                      Delete action #NUMBER (1-based, use -i|--item)
  ref|reference <subcommand> [OPTIONS]
                      Manage references (synonyms: ref, reference)
    list [-t|--task PREFIX]
                      List references for task
    add [URL|TEXT] [-t|--task PREFIX] [-u|--url URL] [-x|--text TEXT] [-r|--relevance REL]
                      Add reference (positional: URL or text, or use -u/-x flags)
    replace -i NUMBER [-t|--task PREFIX] [-u|--url URL] [-x|--text TEXT] [-r|--relevance REL]
                      Replace reference #NUMBER (1-based, use -i|--item)
    delete -i NUMBER [-t|--task PREFIX] [--force]
                      Delete reference #NUMBER (1-based, use -i|--item)
  help                Show this help message

Examples:
  task list
  task -w ~/dev/scv-app list
  task add -n "My Task"
  task push -t T_AZ
  task pop
  task show -t T_AZ
  task show -t T_AZ -f json
  task delete -t T_AZvt
  task delete -t T_AZvt --force
  task action list
  task action list -t T_AZ
  task action add -t T_AZ "New appended action"
  task action add "Another appended action"
  task action add -i 1 "New first action"
  task action replace -i 1 "Updated action"
  task action done  # move first planned action to completed actions
  task action delete -i 1
  task action delete -i 1 --force
  task ref list
  task reference list -t T_AZ
  task ref add https://example.com
  task ref add "Example site"
  task reference add -t T_AZ https://example.com -x "Example site" -r 0.8
  task ref replace -i 1 -x "Updated text"
  task reference delete -i 1
  task ref delete -i 1 --force
```

## Permissions

1. Claude can read any file in project except those in local/
  - EXCEPTION: Claude can read any file in project local/ebt-data
  - EXCEPTION: Claude can read any file in project local/bilara-data
  - EXCEPTION: Claude can read any file in project local/build
  - EXCEPTION: Claude can read any file in project local/audio
  - EXCEPTION: Claude can read/write local/*.log
2. Claude can read any file in project except those in secret/

