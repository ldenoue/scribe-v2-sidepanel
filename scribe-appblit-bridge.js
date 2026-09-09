const SCRIBE_YOUTUBE_PLAYER_REQUEST = 'SCRIBE_YOUTUBE_PLAYER_REQUEST'
const SCRIBE_YOUTUBE_PLAYER_RESPONSE = 'SCRIBE_YOUTUBE_PLAYER_RESPONSE'
const SCRIBE_YOUTUBE_SEARCH_REQUEST = 'SCRIBE_YOUTUBE_SEARCH_REQUEST'
const SCRIBE_YOUTUBE_SEARCH_RESPONSE = 'SCRIBE_YOUTUBE_SEARCH_RESPONSE'
const SCRIBE_FETCH_REQUEST = 'SCRIBE_FETCH_REQUEST'
const SCRIBE_FETCH_RESPONSE = 'SCRIBE_FETCH_RESPONSE'

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin)
    return

  const message = event.data
  if (!message || ![SCRIBE_YOUTUBE_PLAYER_REQUEST, SCRIBE_YOUTUBE_SEARCH_REQUEST, SCRIBE_FETCH_REQUEST].includes(message.type))
    return

  const requestId = message.requestId
  if (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 200)
    return

  chrome.runtime.sendMessage({
    type: message.type,
    requestId,
    payload: message.payload,
    query: message.query,
    params: message.params,
    url: message.url,
    options: message.options,
  }, (response) => {
    const responseType = message.type === SCRIBE_FETCH_REQUEST
      ? SCRIBE_FETCH_RESPONSE
      : message.type === SCRIBE_YOUTUBE_SEARCH_REQUEST
      ? SCRIBE_YOUTUBE_SEARCH_RESPONSE
      : SCRIBE_YOUTUBE_PLAYER_RESPONSE
    if (chrome.runtime.lastError) {
      window.postMessage({
        type: responseType,
        requestId,
        ok: false,
        status: 0,
        error: 'The QuickScribe extension could not handle the request',
      }, window.location.origin)
      return
    }

    window.postMessage({
      type: responseType,
      requestId,
      ...response,
    }, window.location.origin)
  })
})
