import { expect, test } from "@playwright/test";

const widgetHtml = `<!doctype html><html><body>
<div id="block">idle</div>
<script>
window.parent.postMessage({ type: 'GENUI_READY', version: '1.0' }, '*');
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'GENUI_PROMPT') {
    document.getElementById('block').textContent = msg.text;
    window.parent.postMessage({ type: 'GENUI_TOOL_CALL', toolName: 'mock.tool', input: { text: msg.text }, callId: 'c1' }, '*');
    window.parent.postMessage({ type: 'GENUI_LOG_EVENT', event: { type: 'prompt_handled' } }, '*');
  }
  if (msg.type === 'GENUI_PATCH') {
    document.getElementById('block').textContent = msg.patch.ops[0].value;
    window.parent.postMessage({ type: 'GENUI_LOG_EVENT', event: { type: 'patch_applied' } }, '*');
  }
});
<\/script>
</body></html>`;
const widgetDataUrl = `data:text/html;base64,${Buffer.from(widgetHtml).toString("base64")}`;

test("widget mounts on host and handles prompt/patch/log loop", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <body>
        <div id="host-log"></div>
        <iframe id="widget" title="GENUI Workbench Widget" src="${widgetDataUrl}"></iframe>
        <button id="send">send</button>
        <button id="patch">patch</button>
        <script>
          const hostLog = document.getElementById('host-log');
          const iframe = document.getElementById('widget');
          function postToWidget(msg) {
            iframe.contentWindow.postMessage(msg, '*');
          }

          window.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg.type === 'GENUI_READY') {
              postToWidget({ type: 'GENUI_INIT', grantedPermissions: ['network'], enabledSkills: ['data-research'] });
            }
            hostLog.textContent += msg.type + '\\n';
          });

          document.getElementById('send').addEventListener('click', () => {
            postToWidget({ type: 'GENUI_PROMPT', text: 'hello plan' });
          });

          document.getElementById('patch').addEventListener('click', () => {
            postToWidget({ type: 'GENUI_PATCH', patch: { ops: [{ op: 'replace', path: '/blocks/0/text', value: 'patched ui' }] } });
          });
        </script>
      </body>
    </html>
  `);

  const widgetFrame = page.frameLocator("iframe#widget");
  await expect(widgetFrame.locator("#block")).toHaveText("idle");
  await expect(page.locator("#host-log")).toContainText("GENUI_READY");

  await page.getByRole("button", { name: "send" }).click();
  await expect(widgetFrame.locator("#block")).toHaveText("hello plan");

  await page.getByRole("button", { name: "patch" }).click();
  await expect(widgetFrame.locator("#block")).toHaveText("patched ui");

  const hostLog = page.locator("#host-log");
  await expect(hostLog).toContainText("GENUI_TOOL_CALL");
  await expect(hostLog).toContainText("GENUI_LOG_EVENT");
});
