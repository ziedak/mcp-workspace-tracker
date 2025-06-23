#!/bin/bash

# =====================================================================
# MCP Workspace-Tracker - Phase Transition Master Script
# =====================================================================
#
# This script orchestrates both Phase 1 validation and Phase 2 preparation.
# It serves as a one-stop solution for validating Phase 1 completion and
# preparing for Phase 2 implementation.
#
# Usage:
#   bash ./cli/phase-validation/run-phase-transition.sh
#
# =====================================================================

set -e  # Exit on error

echo "====== MCP Workspace-Tracker Phase Transition ======"
echo "Started at: $(date)"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Step 1: Run Phase 1 validation
echo "📋 Step 1: Validating Phase 1 implementation"
bash "$SCRIPT_DIR/validate-phase1.sh"
VALIDATION_STATUS=$?

echo ""
if [ $VALIDATION_STATUS -eq 0 ]; then
    echo "✅ Phase 1 validation completed successfully!"
else
    echo "⚠️ Phase 1 validation completed with some issues. See validation summary for details."
    echo "   This is expected if there are dependency injection issues to resolve."
fi
echo ""

# Step 2: Prepare for Phase 2
echo "📋 Step 2: Preparing for Phase 2 implementation"
bash "$SCRIPT_DIR/prepare-phase2.sh"
PREPARATION_STATUS=$?

echo ""
if [ $PREPARATION_STATUS -eq 0 ]; then
    echo "✅ Phase 2 preparation completed successfully!"
else
    echo "❌ Phase 2 preparation encountered errors. Please check the logs."
fi
echo ""

echo "====== Phase Transition Complete ======"
echo "Phase 1 validation results: /tmp/mcp-phase1-validation/results"
echo "Phase 2 test cases and docs: /tmp/mcp-phase2-prep"
echo ""
echo "Next Steps:"
echo "1. Review Phase 1 validation results"
echo "2. Study Phase 2 requirements in /tmp/mcp-phase2-prep/docs"
echo "3. Begin implementing Phase 2 features"
echo ""
echo "Completed at: $(date)"
