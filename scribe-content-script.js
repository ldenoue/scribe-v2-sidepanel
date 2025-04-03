
let videoId = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.error)
    alert(error)
  if (message.source === 'FROM_IFRAME' && message.id === videoId) {
      //console.log('got message from iframe',message)

      if (message.playrate) {
        //console.log('set playrate', message.playrate)
        let video = document.querySelector('video')
        if (video)
          video.playbackRate = message.playrate
      } else if (message.toggleplay) {
        //console.log('toggleplay')
        let video = document.querySelector('video')
        if (video.paused)
          video.play()
        else
          video.pause()
      }
      else if (message.type === 'play') {
        //console.log('play', message.time, message.same)
        let video = document.querySelector('video')
        if (video) {
          video.currentTime = message.time
          if (!message.same && video.paused)
            video.play()
          if (message.same && !video.paused)
            video.pause()
        }
      }
  }
});

let interval = null
function checkVideo() {
  //console.log('checkVideo')
  let video = document.querySelector('video')
  if (!video) {
    interval = setInterval(checkVideo, 1000)
    return
  }
  clearInterval(interval)
  video.onloadedmetadata = () => {
    //console.log('checking video because onloadedmetadata')
    checkVideo()
  }
  video.ontimeupdate = () => {
    videoId = new URL(window.location.href).searchParams.get('v')
    const skipAd = document.querySelector('.ytp-skip-ad')
    if (skipAd) {
      return
    }
    chrome.runtime.sendMessage({ timeupdate: video.currentTime, id: videoId }, () => chrome.runtime.lastError);
  }
}

checkVideo()
//interval = setInterval(() => checkVideo(), 1000)
