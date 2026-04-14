import { loadSkills, seedSkillpacks } from "@genui/core";
import { installGlobalBridge, mount } from "@genui/widget-iframe";
import { MockPlanner } from "./planner.js";

const DEFAULT_PERMISSIONS = ["network", "files", "code_exec", "crm", "ads", "geo"];

function readCheckedValues(root: HTMLElement, selector: string): string[] {
  return [...root.querySelectorAll<HTMLInputElement>(selector)]
    .filter((input) => input.checked)
    .map((input) => input.value);
}

export function bootDemoHost(root: HTMLElement): void {
  const planner = new MockPlanner();
  installGlobalBridge();

  root.innerHTML = `
    <section>
      <h2>GENUI Demo Host</h2>
      <p>Deterministic prompts: <strong>${planner.getPromptCount()}</strong></p>
      <h4>Permissions</h4>
      <div id="perm-panel">${DEFAULT_PERMISSIONS.map((permission) => `<label><input type="checkbox" class="perm" value="${permission}" checked /> ${permission}</label>`).join(" ")}</div>
      <h4>Skills</h4>
      <div id="skill-panel">${seedSkillpacks.map((skill) => `<label><input type="checkbox" class="skill" value="${skill.id}" checked /> ${skill.id}</label>`).join(" ")}</div>
      <input id="prompt-input" type="text" placeholder="프롬프트 입력" />
      <button id="send-prompt" type="button">Send Prompt</button>
      <pre id="skill-result"></pre>
    </section>
  `;

  const grantedPermissions = readCheckedValues(root, "input.perm");
  const enabledSkills = readCheckedValues(root, "input.skill");
  const selected = seedSkillpacks.filter((skill) => enabledSkills.includes(skill.id));
  const skillLoad = loadSkills(selected, {
    requested: grantedPermissions,
    granted: grantedPermissions
  });

  const skillResult = root.querySelector("#skill-result");
  if (skillResult) {
    skillResult.textContent = JSON.stringify(
      {
        accepted: skillLoad.accepted.map((skill) => skill.id),
        rejected: skillLoad.rejected.map((item) => ({ id: item.skill.id, reason: item.reason }))
      },
      null,
      2
    );
  }

  const widget = mount({
    permissions: grantedPermissions,
    skills: skillLoad.accepted.map((skill) => skill.id),
    position: "right",
    width: 420
  });

  const input = root.querySelector<HTMLInputElement>("#prompt-input");
  const button = root.querySelector<HTMLButtonElement>("#send-prompt");

  if (input && button) {
    button.addEventListener("click", () => {
      const prompt = input.value.trim();
      if (!prompt) {
        return;
      }

      const plan = planner.plan(prompt);
      widget.prompt(prompt);
      console.log("demo-host mock-plan", plan);
    });
  }
}
