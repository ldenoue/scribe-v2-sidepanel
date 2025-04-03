async function showWelcomeMessage() {
  try {
    const welcomeShown = await browser.storage.local.get("welcomeShown");
    if (!welcomeShown.welcomeShown) {
      await browser.tabs.create({ url: "welcome.html" });
      await browser.storage.local.set({ welcomeShown: true });
    }
  } catch (error) {
    console.error("Error showing welcome message:", error);
  }
}

browser.runtime.onInstalled.addListener(showWelcomeMessage);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  /*if (message.error)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        //console.log('from iframe', message)
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });*/
  if (message.source === "FROM_IFRAME") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        //console.log('from iframe', message)
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const url = new URL(tab.url);
  const videoId = url.searchParams.get("v");
  console.log('clicked now', videoId, url.origin, tab.id)
  if (url.origin.indexOf('.youtube.') !== -1 && videoId) {
    console.log('opening sidebar')
    await browser.sidebarAction.open();
  } else {
    await browser.sidebarAction.close();
  }
});

/*chrome.action.onClicked.addListener(async (tab) => {
  let isOpened = await browser.sidebarAction.isOpen({})
  console.log('isOpened=', isOpened)
  if (isOpened)
    await browser.sidebarAction.close();
  else
    await browser.sidebarAction.open();
});*/