const server = "https://www.appblit.com/scribe?v="
//const server = "http://localhost:8081/scribe?v="
browser.tabs.onActivated.addListener(async (activeInfo) => {
  //alert(activeInfo)
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (tabs && tabs.length > 0) {
    const currentUrl = tabs[0].url
    const videoId = isYoutube(currentUrl)
    if (videoId) {
      scribeframe.src= server + videoId
      scribeframe.style.display = 'block'
    } else {
      hide()
    }
  }
});

function hide() {
  //scribeframe.style.display = 'none'
  //msg.textContent = 'Not a YouTube page'
  //scribeframe.src = 'welcome.html'
  //chrome.runtime.sendMessage({error:'Not YouTube'});
  window.close()
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active && tab.windowId === (await browser.windows.getCurrent()).id) {
    const videoId = isYoutube(changeInfo.url)
    if (videoId) {
      scribeframe.src= server + videoId
      scribeframe.style.display = 'block'
    } else {
      hide()
    }
  }
});

function isYoutube(urlString) {
  const url = new URL(urlString);
  let videoId = url.searchParams.get("v");
  if (!videoId && (url.pathname.indexOf('/shorts/') === 0 ||
      url.pathname.indexOf('/embed/') === 0 ||
      url.pathname.indexOf('/live/') === 0))
    videoId = url.pathname.split('/').pop()
  if (url.origin.indexOf('.youtube.') !== -1 && videoId > '')
    return videoId
  return false
}

document.addEventListener("DOMContentLoaded", async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (tabs && tabs.length > 0) {
    const currentUrl = tabs[0].url
    const videoId = isYoutube(currentUrl)
    if (videoId) {
      scribeframe.src= server + videoId
      scribeframe.style.display = 'block'
    } else {
      hide()
    }
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== scribeframe.contentWindow || !event.data || event.data.source !== 'FROM_IFRAME') return;
  if (event.data.type === 'SCRIBE_YOUTUBE_PLAYER_REQUEST' ||
      event.data.type === 'SCRIBE_YOUTUBE_SEARCH_REQUEST' ||
      event.data.type === 'SCRIBE_FETCH_REQUEST') {
    browser.runtime.sendMessage(event.data).then(response => {
      const responseType = event.data.type === 'SCRIBE_FETCH_REQUEST'
        ? 'SCRIBE_FETCH_RESPONSE'
        : event.data.type === 'SCRIBE_YOUTUBE_SEARCH_REQUEST'
        ? 'SCRIBE_YOUTUBE_SEARCH_RESPONSE'
        : 'SCRIBE_YOUTUBE_PLAYER_RESPONSE'
      scribeframe.contentWindow.postMessage({
        type: responseType,
        requestId: event.data.requestId,
        ...response,
      }, event.origin)
    })
    return
  }
  if (event.data.type === 'copy') {
    try {
      navigator.clipboard.writeText(event.data.text);
    } catch (e) {
    }
  } else if (event.data.type === 'print') {
    try {
      const html = event.data.html
      const printWindow = window.open("", "_blank");
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (e) {
      console.log('error print',e)
    }
  } else {
    chrome.runtime.sendMessage(event.data);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.timeupdate !== undefined && message.id) {
    scribeframe.contentWindow.postMessage({ type: "FROM_PAGE", id: message.id, timeupdate: message.timeupdate }, '*')
  }
});
