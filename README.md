# North Star

North Star is a capability constellation demo that visualizes one founder/operator profile as an evidence-backed graph of projects, decisions, metrics, constraints, outcomes, and supporting proof.

## North Star Demo Build

### Demo route

- `/constellation`

### Demo-locked features

- Cinematic constellation canvas with expanded starfield scenery
- Search and node selection with billboard detail panels
- Evidence Mode with hover bridge and neon relationship line
- Reset frame to clear all state
- Universe backdrop hinting at larger future network
- Post-processing with SMAA disabled by default for WebGL stability

### Required demo environment variables

```
VITE_ENABLE_UNIVERSE_BACKDROP=true
VITE_ENABLE_SMAA=false
VITE_ENABLE_BLOOM=true
VITE_ENABLE_POST_PROCESSING=true
VITE_ENABLE_DOF=false
VITE_FOCUS_CAMERA_ON_SELECTION=false
VITE_SEMANTIC_OVERVIEW_MODE_ENABLED=false
```

### Local dev

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Demo lock note

Do not add new visual features to the locked demo path without creating a rollback checkpoint first. The next workstream is presentation + deck, not more demo code.
