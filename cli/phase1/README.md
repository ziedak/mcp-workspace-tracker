# MCP Workspace-Tracker Phase Validation Scripts

This directory contains scripts for validating Phase 1 completion and preparing for Phase 2 implementation of the MCP Workspace-Tracker project.

## Available Scripts

### 1. `run-phase-transition.sh`

Main script that orchestrates both Phase 1 validation and Phase 2 preparation.

```bash
bash ./cli/phase-validation/run-phase-transition.sh
```

### 2. `validate-phase1.sh`

Validates the Phase 1 implementation by:

- Creating a sample workspace in a temporary directory (outside the project)
- Running the server against the sample workspace
- Verifying core components functionality
- Checking API responses
- Generating a comprehensive validation report
- Identifying potential issues needing attention

```bash
bash ./cli/phase-validation/validate-phase1.sh
```

The script produces a detailed validation summary in Markdown format that:

- Shows the status of each component
- Identifies errors and issues
- Provides troubleshooting tips
- Suggests next steps based on validation results

### 3. `prepare-phase2.sh`

Prepares the test environment for Phase 2 features by:

- Creating test cases for class hierarchy analysis
- Creating test cases for dependency graph analysis
- Generating documentation for Phase 2 requirements

```bash
bash ./cli/phase-validation/prepare-phase2.sh
```

### 4. `validate-phase2.sh`

Validates Phase 2 features by running the server against the test cases and checking the APIs.

```bash
bash ./cli/phase-validation/validate-phase2.sh
```

### 5. `analyze-phase2.sh`

Analyzes the Phase 2 test cases and requirements.

```bash
bash ./cli/phase-validation/analyze-phase2.sh
```

## Output Directories

- Phase 1 Validation: `/tmp/mcp-phase1-validation/`
- Phase 2 Preparation: `/tmp/mcp-phase2-prep/`

## Key Files

- Phase 1 Validation Summary: `/tmp/mcp-phase1-validation/results/validation-summary.md`
- Phase 2 Requirements: `/tmp/mcp-phase2-prep/docs/PHASE2-Requirements.md`
- Phase Transition Plan: `/tmp/mcp-phase2-prep/docs/phase-transition.md`

## Notes

- All scripts create their test environments outside the main project workspace to keep it clean
- No code changes are made to the project during validation or preparation
- The scripts use the `./cli/create-sample-workspace.sh` script to generate sample workspaces
