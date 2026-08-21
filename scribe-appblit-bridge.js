const SCRIBE_YOUTUBE_PLAYER_REQUEST = 'SCRIBE_YOUTUBE_PLAYER_REQUEST'
const SCRIBE_YOUTUBE_PLAYER_RESPONSE = 'SCRIBE_YOUTUBE_PLAYER_RESPONSE'

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin)
    return

  const message = event.data
  if (!message || message.type !== SCRIBE_YOUTUBE_PLAYER_REQUEST)
    return

  const requestId = message.requestId
  if (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 200)
    return

  chrome.runtime.sendMessage({
    type: SCRIBE_YOUTUBE_PLAYER_REQUEST,
    requestId,
    payload: message.payload,
  }, (response) => {
    if (chrome.runtime.lastError) {
      window.postMessage({
        type: SCRIBE_YOUTUBE_PLAYER_RESPONSE,
        requestId,
        ok: false,
        status: 0,
        error: 'The Scribe extension could not handle the request',
      }, window.location.origin)
      return
    }

    window.postMessage({
      type: SCRIBE_YOUTUBE_PLAYER_RESPONSE,
      requestId,
      ...response,
    }, window.location.origin)
  })
})
