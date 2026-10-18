# TouchType development instructions

Work directly on `main` unless the developer explicitly asks for a branch or pull request.

This app uses Apps Platform v1 and consumes shared capabilities through `apps-manifest.json`. Do not create local substitutes for shared platform capabilities.

This app uses the shared Apps Version Lab. Read and obey https://nirav2000.github.io/Apps/version-lab/AI_AGENT_CONTRACT.md. Do not implement or maintain local versioning, snapshots or Version Lab UI.

TouchType learner progress is local-first. Do not add Firebase, authentication or other backend infrastructure unless explicitly requested.
