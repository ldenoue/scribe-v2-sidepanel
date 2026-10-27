const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extensionRoot = path.resolve(__dirname, '..');

test('manifest injects the bridge on the www AppBlit QuickScribe page', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8')
  );
  const bridge = manifest.content_scripts.find(entry =>
    entry.js.includes('scribe-appblit-bridge.js')
  );

  assert.ok(bridge);
  assert.ok(bridge.matches.includes('https://www.appblit.com/*'));
  assert.ok(manifest.permissions.includes('webRequest'));
  assert.ok(manifest.permissions.includes('webRequestBlocking'));
  assert.deepEqual(
    manifest.browser_specific_settings.gecko.data_collection_permissions.required,
    ['none']
  );
});

test('Firefox rewrites only YouTube player request origins', () => {
  let registeredListener;
  let registeredFilter;
  let registeredOptions;
  const noopEvent = { addListener() {} };
  const context = {
    AbortController,
    TextEncoder,
    URL,
    clearTimeout,
    console,
    fetch: async () => { throw new Error('not called'); },
    setTimeout,
    browser: {
      action: noopEvent,
      runtime: {
        getURL() { return 'moz-extension://quick-scribe/'; },
        onInstalled: noopEvent,
      },
      sidebarAction: { open() {}, close() {} },
      storage: { local: { async get() { return {}; }, async set() {} } },
      tabs: { async create() {} },
      webRequest: {
        onBeforeSendHeaders: {
          addListener(listener, filter, options) {
            registeredListener = listener;
            registeredFilter = filter;
            registeredOptions = options;
          },
        },
      },
    },
    chrome: {
      action: { onClicked: noopEvent },
      runtime: { onMessage: noopEvent },
      tabs: { query() {}, sendMessage() {} },
    },
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(extensionRoot, 'scribe-background.js'), 'utf8'),
    context
  );

  assert.deepEqual(
    Array.from(registeredFilter.urls),
    ['https://www.youtube.com/youtubei/v1/player*']
  );
  assert.deepEqual(Array.from(registeredFilter.types), ['xmlhttprequest']);
  assert.deepEqual(
    Array.from(registeredOptions),
    ['blocking', 'requestHeaders']
  );

  const result = registeredListener({
    method: 'POST',
    originUrl: 'moz-extension://quick-scribe/scribe-background.js',
    requestHeaders: [
      { name: 'Accept', value: 'application/json' },
      { name: 'Origin', value: 'moz-extension://quick-scribe' },
    ],
  });
  const origin = result.requestHeaders.find(
    header => header.name.toLowerCase() === 'origin'
  );
  assert.equal(origin.value, 'https://www.youtube.com');

  const pageRequestResult = registeredListener({
    method: 'POST',
    originUrl: 'https://www.youtube.com/watch?v=UGuNt2_Oz8s',
    requestHeaders: [{ name: 'Origin', value: 'https://www.youtube.com' }],
  });
  assert.equal(Object.keys(pageRequestResult).length, 0);
});
