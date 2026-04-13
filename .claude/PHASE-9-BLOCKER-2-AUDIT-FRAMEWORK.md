# PHASE 9: BLOCKER 2 — CALLER SERVICE IDENTITIES AUDIT FRAMEWORK

**Status:** READY FOR EXECUTION
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Audit Lead:** (To be assigned)
**Target Completion:** Before Phase 9 production deployment

---

## CURRENT STATE ASSESSMENT

### Phase 9 Implementation Status
- **Current Branch:** main
- **Phase 9 Code:** Not yet implemented
- **Guarded Routes:** Not yet in codebase
- **OperatorKeyGuard Implementation:** Not found

### Audit Status
- **Phase 2A Discovery:** 0 matches found (routes don't exist yet)
- **Why 0 matches?** The 7 guarded routes haven't been created yet. Once Phase 9 branch is merged, audit must be re-run to capture all internal callers.
- **Audit Readiness:** Framework is prepared and ready to execute

---

## AUDIT EXECUTION CHECKLIST

### Pre-Audit Phase (Before Merge)

- [ ] Phase 9 implementation branch created (or provided for review)
- [ ] Branch contains updated backend controllers with OperatorKeyGuard applied
- [ ] Phase 9 OpenAPI spec (if available) lists all 7 guarded endpoints
- [ ] Swift client generator has been configured to include xOperatorKey parameter

### Phase 2A: Codebase Discovery (Run these searches on Phase 9 branch)

**Search 1: operator-summary route**
```bash
grep -r "operator-summary" . --include="*.ts" --include="*.tsx" --include="*.swift" --include="*.json" --include="*.yaml" -n
```
- [ ] Results documented with file paths and line numbers
- [ ] Matches classified (direct client | config | test | docs | generated Swift | handwritten Swift)
- [ ] Caller names extracted from context

**Search 2: /resume route**
```bash
grep -r "\/resume" . --include="*.ts" --include="*.tsx" --include="*.swift" --include="*.json" -n | grep -v "resume.*{" | grep -v "resume.*)" | grep -v "//.*resume"
```
- [ ] Results documented
- [ ] False positives filtered
- [ ] Callers identified

**Search 3: command-center route**
```bash
grep -r "command-center\|commandCenter\|command_center" . --include="*.ts" --include="*.swift" --include="*.yaml" -n
```
- [ ] Results documented
- [ ] Callers identified

**Search 4: retry-gbp-ingestion route**
```bash
grep -r "retry-gbp-ingestion\|retryGbpIngestion\|retry_gbp_ingestion" . --include="*.ts" --include="*.swift" -n
```
- [ ] Results documented
- [ ] Callers identified

**Search 5: resume-postmark route**
```bash
grep -r "resume-postmark\|resumePostmark\|resume_postmark" . --include="*.ts" --include="*.swift" -n
```
- [ ] Results documented
- [ ] Callers identified

**Search 6: ack-alert route**
```bash
grep -r "ack-alert\|ackAlert\|ack_alert" . --include="*.ts" --include="*.swift" -n
```
- [ ] Results documented
- [ ] Callers identified

**Search 7: reports/monthly route**
```bash
grep -r "reports/monthly\|reportsMonthly\|reports_monthly" . --include="*.ts" --include="*.swift" -n
```
- [ ] Results documented
- [ ] Callers identified

**Supplementary: X-Operator-Key references**
```bash
grep -r "X-Operator-Key\|x-operator-key\|xOperatorKey" . --include="*.ts" --include="*.swift" --include="*.yaml" -n
```
- [ ] Results indicate existing awareness of header requirement
- [ ] Any clients already sending header identified

### Phase 2B: Swift Client Inventory

- [ ] Generated Swift clients located (`clients/swift/BlackBoltAPI` or similar)
- [ ] Generated clients counted: **___ total**
- [ ] Handwritten/custom Swift clients identified: **___ total**
- [ ] Each Swift client classified as:
  - [ ] Generated (auto-includes xOperatorKey)
  - [ ] Handwritten (needs manual update)
- [ ] Owner teams identified for each Swift client

### Phase 2C: Service Catalog & Configuration Audit

- [ ] Internal service catalog searched for endpoint references
- [ ] Operator dashboards identified: **___ total**
  - [ ] Names: ___________________________
  - [ ] Owners: ___________________________
- [ ] Scheduled jobs identified: **___ total**
  - [ ] Names: ___________________________
  - [ ] Owners: ___________________________
- [ ] Monitoring/alerting systems identified: **___ total**
  - [ ] Names: ___________________________
  - [ ] Owners: ___________________________

### Phase 2D: Owner Confirmation

- [ ] Owner notification sent to: **___ teams**
- [ ] Owner acknowledgments received: **___ / ___ (_____%)**
  - [ ] All teams acknowledged
  - [ ] **Pending acknowledgments:**
    - [ ] Team: ___________ (notified: ___/___/_____)
    - [ ] Team: ___________ (notified: ___/___/_____)
- [ ] Known blockers documented:
  - [ ] Blocker 1: ___________ (SLA: _________)
  - [ ] Blocker 2: ___________ (SLA: _________)
- [ ] Escalations (if any): **___ escalations**

### Phase 2E: Validation & Sign-Off

- [ ] All grep results cross-checked against owner list
- [ ] No overlaps (same service counted twice)
- [ ] No obvious gaps (missing callers)
- [ ] Total caller count verified:
  - [ ] Swift clients: **___**
  - [ ] Dashboards: **___**
  - [ ] Scheduled jobs: **___**
  - [ ] Other services: **___**
  - [ ] **GRAND TOTAL: ___**
- [ ] Engineering lead sign-off obtained: **YES / NO**
  - [ ] Signature: _______________________
  - [ ] Date: ___________

---

## FINDINGS TABLE TEMPLATE

Once audit is complete, populate this table:

| Route | Method | Caller Count | Caller Names (CSV) | Caller Types | Status | Owner Conf. | Risk Level |
|-------|--------|--------------|-------------------|--------------|--------|------------|-----------|
| `/v1/tenants/{tenantId}/integrations/postmark/operator-summary` | GET | **PENDING** | | | | | |
| `/resume` | POST | **PENDING** | | | | | |
| `/operator/command-center` | POST/GET | **PENDING** | | | | | |
| `/interventions/retry-gbp-ingestion` | POST | **PENDING** | | | | | |
| `/interventions/resume-postmark` | POST | **PENDING** | | | | | |
| `/interventions/ack-alert` | POST | **PENDING** | | | | | |
| `/reports/monthly` | GET | **PENDING** | | | | | |

**Summary Row:**
| **TOTAL** | — | **PENDING** | | | | | |

---

## PER-ROUTE EVIDENCE TEMPLATE

Create a detailed findings document for each route using this template:

### Route: `/v1/tenants/{tenantId}/integrations/postmark/operator-summary`

**Method:** GET
**Grep Result Count:** (to be populated)
**Search Confidence:** HIGH | MEDIUM | LOW
**Criticality:** LOW (monitoring/visibility, not blocking)

| File Path | Line # | Context | Caller Type | Caller Name | Owner Team | Status | Notes |
|-----------|--------|---------|-------------|-------------|------------|--------|-------|
| (to be populated) | | | | | | | |

**Risk Assessment:**
- Single point of failure? YES | NO
- Blocking incident response? YES | NO
- Can fallback without X-Operator-Key? YES | NO
- Timeline to update: ____________

---

## GO / NO-GO DECISION CRITERIA

### PASS (Proceed to Blocker 3)

- [ ] All 7 routes successfully searched (grep pattern confirmed working)
- [ ] Every non-test/docs match has a caller name assigned
- [ ] Caller count is known and documented: "X Swift clients, Y dashboards, Z jobs, W other"
- [ ] Every caller has an identified owner team
- [ ] Every owner team has been notified
- [ ] **Minimum 80% of owner teams have acknowledged** X-Operator-Key requirement
- [ ] No blockers prevent updates before deployment window
  - OR blockers documented and escalations approved
- [ ] Findings table complete (no PENDING rows)
- [ ] Engineering lead sign-off: **YES**

### NO-GO (Blocker 2 Blocked)

- [ ] Any route has 0 matches after grep + alternative patterns (search failure)
- [ ] Caller count cannot be determined (ambiguous matches)
- [ ] Owner team unknown for any caller (coordination risk)
- [ ] **Fewer than 80% of owners acknowledged** (deployment risk)
- [ ] Any owner explicitly states they cannot update by deployment date (showstopper)
- [ ] Swift client inventory incomplete (cannot confirm all clients ready)

**If NO-GO:** Document issue, escalate, and delay Phase 9 deployment until resolved.

---

## BLAST RADIUS REFERENCE

### Critical Routes (Block Incident Response)
- **Route:** `/resume`
  **Impact if missed:** Postmark sends stuck, can't resume via API
  **Severity:** CRITICAL
  **Recovery:** Rollback OperatorKeyGuard, manual caller update, redeploy

- **Route:** `/interventions/resume-postmark`
  **Impact if missed:** Same as above
  **Severity:** CRITICAL
  **Recovery:** Same as above

- **Route:** `/interventions/ack-alert`
  **Impact if missed:** Operator alert workflow broken
  **Severity:** HIGH
  **Recovery:** Rollback + update

### High-Risk Routes (Ops Visibility)
- **Route:** `/operator/command-center`
  **Impact if missed:** Operator dashboard offline
  **Severity:** HIGH

### Medium-Risk Routes (Can Retry Next Cycle)
- **Route:** `/interventions/retry-gbp-ingestion`
  **Impact if missed:** Manual retries unavailable, can retry on next cron
  **Severity:** MEDIUM

### Low-Risk Routes (Visibility/Reporting)
- **Route:** `/v1/tenants/{tenantId}/integrations/postmark/operator-summary`
  **Impact if missed:** Monitoring visibility lost, not blocking
  **Severity:** LOW

- **Route:** `/reports/monthly`
  **Impact if missed:** Monthly reports fail, can regenerate manually
  **Severity:** LOW

---

## NEXT STEPS

### Immediate (Now)
1. ✅ Audit framework document created
2. ⏳ Awaiting Phase 9 branch submission

### Upon Phase 9 Branch Arrival
1. Execute Phase 2A grep searches (7 routes + supplementary)
2. Document all matches with file paths and context
3. Classify each match (direct client | config | test | docs | Swift)
4. Extract caller names from code context
5. Proceed to Phase 2B-2E

### Pre-Deployment (Week Before)
1. Run Phase 2 audit to completion
2. Obtain owner confirmations
3. Document all blockers and SLAs
4. Populate findings table
5. Obtain engineering lead sign-off
6. Decision: GO or NO-GO
7. If GO: Handoff to Blocker 3 (X-Operator-Key Provisioning)

### Post-Deployment (After Phase 9 Merge)
1. Staged rollout with monitoring
2. Watch for unexpected 401 errors
3. If 401 cascade: Trigger rollback (< 5 minutes via feature flag)
4. Root cause: Identify missed caller, update, re-merge Phase 9

---

## AUDIT LEAD RESPONSIBILITIES

- [ ] Schedule audit execution once Phase 9 branch available
- [ ] Run all grep searches and document results
- [ ] Classify matches and extract caller names
- [ ] Identify owner teams for each caller
- [ ] Send owner notifications (with link to X-Operator-Key requirement docs)
- [ ] Track acknowledgment responses
- [ ] Escalate blockers if any owner cannot update by deadline
- [ ] Compile findings table and evidence documents
- [ ] Obtain engineering lead sign-off
- [ ] Present findings and recommendation (GO / NO-GO) to deployment lead

---

## AUDIT HISTORY

| Date | Event | Status |
|------|-------|--------|
| 2026-03-25 | Framework created, Phase 9 code not yet available | READY FOR EXECUTION |
| (to be updated) | Phase 9 branch received, audit begins | IN PROGRESS |
| (to be updated) | Audit complete, findings documented | COMPLETE |
| (to be updated) | Owner confirmations received | COMPLETE |
| (to be updated) | GO/NO-GO decision made | DECISION DOCUMENTED |

---

**This document is the executable plan for Blocker 2. Once Phase 9 implementation is provided, execute each phase in sequence and populate the checklists and findings tables above.**
