# /build-feature

Purpose: build a net-new feature as a tracer bullet before expanding scope.

Workflow:
1. Define the smallest user-visible end-to-end slice that touches each required layer.
2. If the slice cannot be executed or validated immediately, shrink it until it can.
3. Implement only that first slice, using thin seams or minimal adapters where needed.
4. Validate it immediately with at least one executable integration or end-to-end path.
5. Stop after the first working slice instead of broadening scope in the same pass.
6. Summarize what works now, what is intentionally thin or stubbed, and the next 2-3 slices to build after feedback.
