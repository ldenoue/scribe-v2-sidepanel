const SCRIBE_YOUTUBE_PLAYER_REQUEST = 'SCRIBE_YOUTUBE_PLAYER_REQUEST';
const SCRIBE_YOUTUBE_SEARCH_REQUEST = 'SCRIBE_YOUTUBE_SEARCH_REQUEST';
const SCRIBE_FETCH_REQUEST = 'SCRIBE_FETCH_REQUEST';
const YOUTUBE_PLAYER_MAX_BODY_BYTES = 100_000;
const YOUTUBE_PLAYER_TIMEOUT_MS = 15_000;
const YOUTUBE_CLIENTS = {
  WEB: {
    headerName: '1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/142.0',
  },
  MWEB: {
    headerName: '2',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  ANDROID: {
    headerName: '3',
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 12) gzip',
  },
  IOS: {
    headerName: '5',
    userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
  },
  ANDROID_VR: {
    headerName: '28',
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.62.20 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
  },
};

async function proxyFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_PLAYER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error && error.name === 'AbortError' ? 'Fetch timed out' : 'Fetch failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYoutubePlayer(payload) {
  let body;
  try {
    body = JSON.stringify(payload ?? {});
  } catch {
    return { ok: false, status: 400, error: 'Invalid request payload' };
  }

  if (new TextEncoder().encode(body).byteLength > YOUTUBE_PLAYER_MAX_BODY_BYTES)
    return { ok: false, status: 413, error: 'Request payload too large' };

  const videoId = payload?.videoId;
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId))
    return { ok: false, status: 400, error: 'Invalid YouTube video ID' };

  const requestedClient = payload?.context?.client;
  const clientProfile = YOUTUBE_CLIENTS[requestedClient?.clientName] || YOUTUBE_CLIENTS.WEB;
  const clientVersion = typeof requestedClient?.clientVersion === 'string' &&
    /^[0-9A-Za-z._-]{1,40}$/.test(requestedClient.clientVersion)
    ? requestedClient.clientVersion
    : '2.20210721.00.00';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_PLAYER_TIMEOUT_MS);
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': clientProfile.userAgent,
        'X-YouTube-Client-Name': clientProfile.headerName,
        'X-YouTube-Client-Version': clientVersion,
        Origin: 'https://www.youtube.com',
      },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    let responsePayload = text;
    try {
      responsePayload = JSON.parse(text);
    } catch {
      // Preserve a non-JSON upstream response for diagnostics.
    }
    return { ok: response.ok, status: response.status, payload: responsePayload };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error && error.name === 'AbortError'
        ? 'YouTube request timed out'
        : 'YouTube request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYoutubeSearch(query, params = null) {
  if (typeof query !== 'string' || query.trim().length < 1 || query.length > 500)
    return { ok: false, status: 400, error: 'Invalid YouTube search query' };
  if (params !== null && (typeof params !== 'string' || params.length > 500))
    return { ok: false, status: 400, error: 'Invalid YouTube search filter' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_PLAYER_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}${params ? `&sp=${encodeURIComponent(params)}` : ''}`,
      { signal: controller.signal }
    );
    return {
      ok: response.ok,
      status: response.status,
      payload: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error && error.name === 'AbortError'
        ? 'YouTube search timed out'
        : 'YouTube search failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
  if (message.type === SCRIBE_FETCH_REQUEST) {
    proxyFetch(message.url, message.options).then(sendResponse);
    return true;
  }
  if (message.type === SCRIBE_YOUTUBE_PLAYER_REQUEST) {
    fetchYoutubePlayer(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === SCRIBE_YOUTUBE_SEARCH_REQUEST) {
    fetchYoutubeSearch(message.query, message.params).then(sendResponse);
    return true;
  }

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
  let videoId = url.searchParams.get("v");
  if (!videoId && (url.pathname.indexOf('/shorts/') === 0 ||
      url.pathname.indexOf('/embed/') === 0 ||
      url.pathname.indexOf('/live/') === 0))
    videoId = url.pathname.split('/').pop();
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
