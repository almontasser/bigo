<template>
  <div style="height: 100%; position: relative;">
    <div v-show="!loaded" class="loading-frame text-center">
      <div v-if="noMediaFound" style="color: white; font-size: 2rem;">User Is not Live</div>
      <div v-if="videoEnded" style="color: white; font-size: 2rem;">Live video Ended</div>
      <b-spinner v-if="!noMediaFound && !videoEnded" class="spinner" style="width: 3rem; height: 3rem;" label="Large Spinner"></b-spinner>
    </div>
    <div v-if="userIsPaused" class="user-is-paused"></div>
    <video
      ref="videoPlayer"
      class="video-js"
    ></video>
  </div>
</template>

<script>
import videojs from 'video.js'

import 'video.js/dist/video-js.css'

export default {
  props: ['id', 'name', 'videoUrl', 'videoRefreshTimeout'],
  data () {
    return {
      loaded: false,
      noMediaFound: false,
      videoEnded: false,
      previousTime: 0,
      refreshTimeout: null,
      loadeddata: false,
      player: null,
      playerOptions: {
        autoplay: true,
        controls: false,
        loadingSpinner: false,
        fill: true,
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            handlePartialData: true
          }
        }
      },
      userIsPaused: false
    }
  },
  methods: {
    onPlayerWait (event) {
      this.log('wait')
      if (this.userIsPaused) return
      if (this.loadeddata && this.videoRefreshTimeout > 0 && !this.refreshTimeout) {
        console.log('Created Timeout')
        this.refreshTimeout = setTimeout(() => {
          console.log('Executed Timeout')
          this.refreshTimeout = null
          this.playVideo(this.videoUrl)
        }, this.videoRefreshTimeout)
      }
    },
    onPlayerCanplay () {
      this.log('timeupdate')

      if (this.refreshTimeout) {
        console.log('Cleared Timeout')
        clearInterval(this.refreshTimeout)
        this.refreshTimeout = null
      }
    },
    onPlayerLoadeddata () {
      this.log('loadeddata')
      this.loadeddata = true
      this.loaded = true
    },
    onPlayerError (error) {
      this.log('error')

      error.stopImmediatePropagation()
      if (this.player.error() && this.player.error().code === 4) this.noMediaFound = true
    },
    playVideo (source) {
      this.loadeddata = false
      const video = {
        withCredentials: false,
        type: 'application/x-mpegURL',
        src: source
      }
      this.player.src(video)
    },
    reload () {
      this.playVideo(this.videoUrl)
    },
    userPaused () {
      this.userIsPaused = true
      this.player.pause()
    },
    userResumed () {
      this.userIsPaused = false
      this.player.play()
    },
    toggleControls () {
      this.player.controls(!this.player.controls())
    },
    roomEnded () {
      this.player.reset()
      this.videoEnded = true
      this.loaded = false
    },
    log (msg) {
      // console.log(msg)
    }
  },
  watch: {
    videoUrl () {
      if (!this.videoUrl) {
        this.playVideo('')
      } else {
        this.playVideo(this.videoUrl)
      }
    }
  },
  mounted () {
    this.player = videojs(this.$refs.videoPlayer, this.playerOptions, function onPlayerReady () {})
    this.player.on('waiting', this.onPlayerWait)
    this.player.on('canplay', this.onPlayerCanplay)
    this.player.on('loadeddata', this.onPlayerLoadeddata)
    this.player.on('error', this.onPlayerError)
    this.playVideo(this.videoUrl)
  }
}
</script>

<style>
.vjs-tech {
  pointer-events: none;
}

.loading-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  height: 100%;
}

.loading-frame .spinner {
  color: white;
}

.close-video-frame {
  position: absolute;
  z-index: 2;
}

.user-is-paused {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.2),
    rgba(0, 0, 0, 0.2) 10px,
    rgba(0, 0, 0, 0.3) 10px,
    rgba(0, 0, 0, 0.3) 20px
  )
}

.video-player {
  width: 100%;
  height: 100%;
}

</style>
