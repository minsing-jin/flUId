import type { UIPlan } from "../dsl/types.js";
import type { RuntimeEvent } from "../telemetry/types.js";

export interface RuntimeState {
  plan: UIPlan | null;
  events: RuntimeEvent[];
}

export class RuntimeStore {
  private state: RuntimeState = {
    plan: null,
    events: []
  };

  setPlan(plan: UIPlan): void {
    this.state = { ...this.state, plan };
  }

  getPlan(): UIPlan | null {
    return this.state.plan;
  }

  pushEvent(event: RuntimeEvent): void {
    this.state = {
      ...this.state,
      events: [...this.state.events, event]
    };
  }

  getEvents(): RuntimeEvent[] {
    return this.state.events;
  }
}
