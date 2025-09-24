---
trigger: always_on
---

Comprehensive Rules and Instructions for AI Coders in VITE + REACT + TYPESCRIPT Project

This rules set is designed for AI coders working on the Chain Capital project, located at `/Users/neilbatchelor/silver-garbanzo-chain-capital`, with frontend at `/frontend` and backend at `/backend`. It emphasizes meticulous attention to detail, adherence to standards, and methodical processes. The framework uses Vite + React + Typescript with a Supabase database. Always write code conforming to these frameworks and tools. Do not deviate from these rules; treat them as explicit requirements to verify at every stage.


 1. General Project Approach: Structured Workflow for Consistent Adherence
Follow this structured approach to ensure consistent adherence to project instructions:

 1.1 Initial Requirements Analysis
- Create a checklist of all project requirements and constraints before starting any work.
- Break down complex instructions into verifiable points.
- Document the requirements checklist in memory immediately using MCP filesystem or commander.
- Always check the database schema, review project instructions files, use MCP navigate, and check console errors in the browser where necessary.

 1.2 Pre-Implementation Database/Codebase Exploration
- ALWAYS query the database first to understand existing schemas (use MCP to query the remote Supabase database; do not assume a local database).
- Analyze relevant existing files to understand patterns and conventions.
- Document findings in memory to reference throughout implementation.
- Think sequentially and always use MCP filesystem read/write and MCP query database as necessary.
- Search the web/internet as necessary.
- Check all files and folders within a provided folder.
- Check documents if necessary.
- Search, create, edit, and remove files on the filesystem using MCP filesystem as necessary.
- Only make SQL migration scripts that are compliant with the existing schema and Supabase syntax.
- User prefers to write SQL scripts conforming to Supabase Postgres rules and apply them manually after each conversation.
- User prefers to never use simulated schemas or results or mock data in code and requests removal of all such data.
- Do not create test components or test scripts until explicitly asked.

 1.3 Implementation Checkpoints
- Review the project instructions checklist before starting each component.
- After implementing each component, verify it against:
  - Naming conventions (detailed in Section 4).
  - Code organization standards.
  - Error handling requirements.
- Create memory observations after completing each significant component.
- Proceed like a senior developer (or 10x engineer): Start by writing three reasoning lines analyzing what the error might be (do not jump to conclusions; start with lots of uncertainty and slowly gain confidence).
- Before answering, write two to four detailed lines (two for each solution) in an unbiased 50/50 manner; do not jump to conclusions or commit to either until fully considered, then state which is obviously better and why.
- Break large changes into truly necessary steps only.
- Do not stop working until the feature is fully and completely implemented.
- Fix any errors in the code before completing a task.
- Its extremely important that you do not finish a task with Build-Blocking Errors; please check to ensure that we have working files after every task.
- Always check for linter and Typescript errors and resolve before delivery.
- Inform the user of any missing node modules to install to enable functionality.
- Always update `App.tsx` in `/Users/neilbatchelor/silver-garbanzo-chain-capital` when necessary.
- Before starting new tasks, read graph and latest observations.
- Before completing a task, create new observations.
- When starting a new task, recall your most recent observations and entities created in memory.
- When focused on anything permissions-based, only use permissions listed in `permissions_rows.csv` in project knowledge.
- In this project, do not use `@lib`; search for the relevant files instead.

 1.4 Pre-Delivery Verification
- Ensure all components are properly tested and integrated.
- Confirm documentation is complete and follows project standards.
- Always summarize changes if you make changes to files; always list file names and locations.
- Always summarize what tasks are: Completed, Partially Completed, or Remaining; suggest what to proceed with next. Add and update progress on every task to memory.

 1.5 Continuous Learning Loop
- At the end of each project, review what went well and what could be improved.
- Update the systematic approach based on feedback.
- Create a memory entity for lessons learned to reference in future projects.
- Commit memories to MCP memory: create entities, open nodes, create relations, add observations, delete entities, delete observations, delete relations, read graph, search nodes.