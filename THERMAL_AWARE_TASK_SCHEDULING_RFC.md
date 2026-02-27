# RFC: Thermal-Aware Task Scheduling for Development Workflows

**Status:** Proposal  
**Date:** January 2026  
**Target Communities:** Green Software Foundation, OpenJS Foundation  
**Estimated Impact:** 3-10% energy reduction in development CI/CD pipelines

---

## Problem Statement

Development workflows (builds, tests, compilation) consume significant energy, particularly when:

- Tasks execute on thermal-constrained devices (laptops, mobile devices)
- Multiple concurrent builds saturate CPU, causing thermal throttling
- No awareness of grid carbon intensity during task execution

Current solutions optimize for _speed_, not energy efficiency. A developer waiting 10 seconds instead of 5 seconds is acceptable if it reduces carbon footprint by 30%.

**The opportunity:** Device thermal state and grid carbon intensity are measurable, predictable inputs that can inform task scheduling without degrading user experience significantly.

---

## Proposed Solution

A pluggable task scheduling layer that:

1. **Monitors device thermal state** (CPU temperature)
2. **Coordinates with grid carbon intensity** (via Carbon-Aware SDK)
3. **Delays non-critical tasks** when conditions are unfavorable
4. **Executes tasks when optimal** (cool device + clean grid)

### Core Principle

- **Thermal throttling is inevitable.** Instead of fighting it, we schedule _around_ it.
- **Grid isn't constant.** Renewable energy abundance varies hourly. Batch work accordingly.
- **User tolerance exists.** Developers accept 10-60 second delays if they know why.

---

## Architecture

### Layer 1: Thermal Monitoring

```
Device CPU Temperature
    ↓
Thermal Threshold Engine
    ├─ < 50°C:  Execute all tasks
    ├─ 50-65°C: Defer non-critical tasks
    ├─ 65-80°C: Defer all non-urgent tasks
    └─ > 80°C:  Pause, let device cool
    ↓
Scheduler Decision
```

**Implementation:** Linux `sysfs` thermal zones, macOS `Energy.framework`, Windows Performance Counters

### Layer 2: Grid-Aware Timing

```
Current Grid Carbon Intensity
    ↓
Carbon-Aware SDK (existing GSF tool)
    ├─ Grid intensity < 300g CO2/kWh: Execute immediately
    ├─ Grid intensity 300-500:        Batch tasks (defer 1-4 hours)
    └─ Grid intensity > 500:          Batch tasks (defer 4-8 hours)
    ↓
Scheduler Decision
```

**Implementation:** Integrate with existing Carbon-Aware SDK; support regional grids

### Combined Scheduling Logic

```
thermal_score = (80 - current_temp) / 80        // 0 to 1
grid_score = (500 - grid_intensity) / 500       // 0 to 1 (normalized)
combined_score = (thermal_score * 0.6) + (grid_score * 0.4)

if combined_score > 0.7:
  execute_task()
else:
  defer_task(recommended_delay_ms)
```

---

## Implementation Scope

### Phase 1: MVP (4-8 weeks)

**Core deliverables:**

- Thermal monitoring library (platform-agnostic interface)
- Task scheduler with configurable thresholds
- npm package: `@thermalaware/task-scheduler`
- Integration example with Node.js build tools

**Platform support:**

- Linux (primary)
- macOS (secondary)
- Windows (community contribution)

**Build system integrations:**

- npm scripts (hooks)
- Webpack plugin (example)
- Vite plugin (example)

**Metrics/Reporting:**

- Energy saved estimate (Joules)
- Carbon avoided estimate (g CO2e)
- Task deferral history

### Phase 2: Ecosystem Integration (Future)

- GitHub Actions integration
- GitLab CI integration
- Jenkins plugin
- Cloud provider partnerships (AWS, GCP, Azure)

### Phase 3: Device Network (Separate Initiative)

- Distributed compute pool for clean-energy devices
- Micropayment incentive structure
- (Out of scope for this RFC)

---

## Technical Specifications

### Thermal API (Platform Abstraction)

```javascript
class ThermalMonitor {
  // Get current CPU temperature (°C)
  async getCPUTemperature() → number

  // Get thermal threshold before throttling (°C)
  async getThermalThreshold() → number

  // Get available thermal headroom (0-100%)
  async getThermalHeadroom() → number

  // Subscribe to temperature changes
  onTemperatureChange(callback: (temp: number) => void)
}
```

### Scheduler API

```javascript
class ThermalAwareScheduler {
  constructor(options: {
    thermalThreshold: number = 65,      // °C
    gridIntensityThreshold: number = 400, // g CO2/kWh
    enableGridAwareness: boolean = true,
    region: string = 'auto'
  })

  // Queue a task for execution
  async scheduleTask(task: Task, options?: TaskOptions) → Promise<Result>

  // Get scheduler status
  async getStatus() → SchedulerStatus

  // Manual override
  async executeNow(task: Task) → Promise<Result>
}
```

### Task Configuration

```javascript
// Example task with priority tiers
const tasks = [
  {
    name: "compile-source",
    priority: "critical", // Execute immediately, regardless
    timeout: 300000, // 5 minutes
  },
  {
    name: "run-tests",
    priority: "normal", // Defer if thermal > 65°C
    timeout: 600000, // 10 minutes
  },
  {
    name: "generate-docs",
    priority: "low", // Defer if thermal > 55°C or grid intensity high
    timeout: 1800000, // 30 minutes
  },
];
```

---

## Benefits

### Developer Experience

- ✅ Explicit visibility into why tasks defer ("device cooling" vs "waiting for clean grid")
- ✅ Configurable thresholds (can override if needed)
- ✅ No breaking changes to existing workflows
- ✅ Optional adoption (backward compatible)

### Energy Impact

- **Thermal optimization:** 3-5% energy reduction (avoids thermal throttling)
- **Grid-aware timing:** 5-15% carbon reduction (moves compute to cleaner periods)
- **Combined:** 8-20% energy/carbon reduction in average scenarios
- **Enterprise scale:** $270K-$700K annual savings (100-person dev team)

### Environmental

- Reduces demand during peak grid stress
- Incentivizes renewable energy investment
- Sets precedent for developer tool sustainability

---

## Comparison with Existing Solutions

| Feature             | Thermal-Aware Scheduler | Carbon-Aware SDK | Traditional CI/CD |
| ------------------- | ----------------------- | ---------------- | ----------------- |
| Thermal monitoring  | ✅                      | ❌               | ❌                |
| Grid-aware timing   | ✅                      | ✅               | ❌                |
| Local task deferral | ✅                      | ❌               | ❌                |
| Cloud integration   | 🔜                      | ✅               | ✅                |
| Framework agnostic  | ✅                      | ✅               | ❌                |

**Complementarity:** This scheduler uses Carbon-Aware SDK (not replacement), adds thermal component, and focuses on local development workflows where Carbon-Aware SDK is less applicable.

---

## Integration with Green Software Foundation

**Alignment:**

- Implements GSF Impact Framework (measure, reduce, verify)
- Uses/extends Carbon-Aware SDK
- Contributes to "Reducing Software Carbon Intensity" standard
- Provides implementation reference for sustainable dev tooling

**Contribution Path:**

1. Submit RFC to GSF Standards Working Group
2. Collaborate on Integration Guidelines for Carbon-Aware SDK compatibility
3. Publish reference implementation under Apache 2.0 license
4. Document best practices for framework/platform integrations

---

## Implementation Timeline

| Phase                 | Duration  | Deliverables                           |
| --------------------- | --------- | -------------------------------------- |
| **Design & Spec**     | 1 week    | API docs, thermal platform abstraction |
| **Core Library**      | 2-3 weeks | ThermalMonitor, TaskScheduler, metrics |
| **Build Integration** | 1-2 weeks | npm, Webpack, Vite examples            |
| **Testing & Docs**    | 1 week    | Unit tests, integration tests, guides  |
| **Community Review**  | 1-2 weeks | RFC feedback, iteration                |
| **Release (v0.1.0)**  | Ongoing   | npm package, maintenance               |

**Total MVP:** 6-10 weeks  
**Required Resources:** 1 full-time engineer + intermittent GSF/community review

---

## Success Metrics

### Adoption

- 1K+ npm package downloads in first 3 months
- Integration into 10+ build tools (webpack, vite, rollup, etc.)
- Support from 3+ major frameworks

### Energy Impact

- 100+ developers using thermal-aware scheduling
- Aggregate 5-10% energy reduction across user base
- Measurable carbon avoided: 10-100 tons CO2e/year

### Ecosystem

- Adoption by OpenJS Foundation standards
- Contribution pathway to Linux Foundation projects
- Reference implementation for sustainable dev tools

---

## Risk Mitigation

**Risk:** Developers ignore deferral recommendations, disable feature  
**Mitigation:** Make benefits visible (carbon saved, cost averted), honor user override with logging

**Risk:** Platform fragmentation (different thermal APIs per OS)  
**Mitigation:** Abstract thermal interface early; prioritize Linux (majority of CI/CD), community helps expand

**Risk:** Over-aggressive deferral reduces productivity  
**Mitigation:** Tunable thresholds, granular priority levels, critical-path bypass option

**Risk:** Grid data unavailable in some regions  
**Mitigation:** Graceful degradation to thermal-only mode; fallback to no-deferral if data unavailable

---

## Questions & Feedback

**For Green Software Foundation:**

- Does this complement or conflict with Carbon-Aware SDK roadmap?
- Interest in integration as GSF-endorsed tool?
- Standards/certification pathway?

**For OpenJS Foundation:**

- Would this be valuable as npm ecosystem standard?
- Integration with npm/node tooling working group?

**For broader community:**

- Which build tools/frameworks should we prioritize for Phase 2?
- Platform support priorities (Windows timing before Linux optional)?

---

## References

- Green Software Foundation: https://www.greensoftware.foundation
- Carbon-Aware SDK: https://github.com/Green-Software-Foundation/carbon-aware-sdk
- OpenJS Foundation: https://openjsf.org
- Linux Thermal: https://www.kernel.org/doc/html/latest/driver-api/thermal/

---

## Appendix: Example Usage

### Basic npm script integration

```json
{
  "scripts": {
    "build": "thermal-schedule build-webpack",
    "test": "thermal-schedule test-jest",
    "docs": "thermal-schedule low-priority generate-docs"
  }
}
```

### Programmatic usage

```javascript
const { ThermalAwareScheduler } = require("@thermalaware/task-scheduler");

const scheduler = new ThermalAwareScheduler({
  region: "us-west", // Grid region
  thermalThreshold: 65, // °C
});

await scheduler.scheduleTask({
  name: "build",
  priority: "normal",
  execute: () => spawn("webpack", ["build"]),
});
```

### Output example

```
[ThermalAware] Device temp: 62°C (headroom: 23%)
[ThermalAware] Grid intensity: 380 g CO2/kWh (moderate)
[ThermalAware] Executing: webpack build
[ThermalAware] Task completed in 45s
[ThermalAware] Energy saved: ~2 kJ vs peak thermal
[ThermalAware] Carbon avoided: ~0.5g CO2e vs avg execution time
```
