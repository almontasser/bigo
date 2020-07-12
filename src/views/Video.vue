<template>
  <div style="height: 100%" @contextmenu.prevent.stop="handleRightClick($event, {id, name})">
    <vue-simple-context-menu
        :elementId="'videoFrameMenu'"
        :options="videoFrameMenuOptions"
        :ref="'videoFrameMenu'"
        @option-clicked="optionClicked"
      />
    <!-- <p style="position: absolute; z-index: 10; color: white;">{{this.name}} - {{this.id}}</p> -->
    <div v-show="!loaded" class="loading-frame text-center">
      <div v-if="noMediaFound" style="color: white; font-size: 2rem;">User Is not Live</div>
      <div v-if="videoEnded" style="color: white; font-size: 2rem;">Live video Ended</div>
      <b-spinner v-if="!noMediaFound" class="spinner" style="width: 3rem; height: 3rem;" label="Large Spinner"></b-spinner>
    </div>
    <div v-if="userIsPaused" class="user-is-paused"></div>
    <video
      ref="videoPlayer"
      class="video-js"
    ></video>
    <!-- <video-player
      v-if="!noMediaFound"
      v-show="loaded"
      ref="videoPlayer"
      class="vjs-custom-skin"
      :options="playerOptions"
      @ready="log('ready'); onPlayerReady($event)"
      @play="log('play'); onPlayerPlay($event)"
      @loadeddata="log('loadeddata'); onPlayerLoadeddata($event)"
      @error="log('error'); onPlayerError($event)"
      @waiting="onPlayerWait($event)"
      @abort="log('abort')"
      @canplay="log('canplay'); onPlayerCanplay($event)"
      @canplaythrough="log('canplaythrough')"
      @change="log('change')"
      @durationchange="log('durationchange')"
      @emptied="log('emptied')"
      @invalid="log('invalid')"
      @load="log('load')"
      @loadedmetadata="log('loadedmetadata')"
      @loadstart="log('loadstart')"
      @pause="log('pause')"
      @playing="log('playing')"
      @progress="log('progress')"
      @ratechange="log('ratechang')"
      @readystatechange="log('readystatechange')"
      @seeked="log('seeked')"
      @seeking="log('seeking')"
      @suspend="log('suspend')"
      @timeupdate="log('timeupdate'); onPlayerTimeupdate($event)"
      @resize="log('resize')"
    ></video-player> -->
  </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron'
import videojs from 'video.js'

import 'video.js/dist/video-js.css'

export default {
  data () {
    return {
      id: 0,
      name: '',
      loaded: false,
      noMediaFound: false,
      videoEnded: false,
      videoUrl: '',
      previousTime: 0,
      videoRefreshTimeout: 5000,
      refreshTimeout: null,
      loadeddata: false,
      player: null,
      playerOptions: {
        autoplay: true,
        controls: false,
        loadingSpinner: false,
        // fluid: true,
        fill: true
      },
      videoFrameMenuOptions: [
        { id: 2, name: 'Reload' },
        { id: 3, name: 'Open chat' },
        { id: 0, name: 'Add to favorites' },
        { id: 1, name: 'Hide' }
      ],
      userIsPaused: false,
      videoWidth: 0,
      videoHeight: 0
    }
  },
  computed: {
    // player () {
    //   if (this.$refs.videoPlayer) return this.$refs.videoPlayer.player
    //   else return null
    // }
  },
  methods: {
    log (msg) {
      // console.log(msg)
    },
    onPlayerWait (event) {
      this.log('wait')

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
      const video = this.$refs.videoPlayer
      if (video.addEventListener) {
        video.addEventListener('contextmenu', function (e) {
          e.preventDefault()
        }, false)
      } else {
        video.attachEvent('oncontextmenu', function () {
          window.event.returnValue = false
        })
      }

      this.loaded = true
    },
    onPlayerPlay () {},
    onPlayerReady () {},
    onPlayerError (error) {
      this.log('error')

      error.stopImmediatePropagation()
      if (this.player.error() && this.player.error().code === 4) this.noMediaFound = true
    },
    onPlayerTimeupdate (event) {
      // const video = this.$refs.videoPlayer

      // const w = video.videoWidth
      // const h = video.videoHeight

      // if (this.videoWidth !== w || this.videoHeight !== h) {
      //   this.videoWidth = w
      //   this.videoHeight = h
      //   // ipcRenderer.send('setWindowSize', { id: this.id, w, h, forceResize: false })
      //   // this.player.fill(true)
      //   // this.player.fluid(true)
      // }
    },
    playVideo: function (source) {
      this.loadeddata = false
      const video = {
        withCredentials: false,
        type: 'application/x-mpegURL',
        src: source
      }
      if (!this.player) return
      this.player.reset() // in IE11 (mode IE10) direct usage of src() when <src> is already set, generated errors,
      this.player.src(video)
      // this.player.load()
      this.player.play()
    },
    handleRightClick (event, item) {
      this.$refs.videoFrameMenu.showMenu(event, item)
    },
    async optionClicked (event) {
      if (event.option.id === 0) {
        ipcRenderer.send('showFavDialog', event.item)
      } else if (event.option.id === 1) {
        ipcRenderer.send('closeVideo', event.item.id)
      } else if (event.option.id === 2) {
        remote.getCurrentWindow().reload()
      } else if (event.option.id === 3) {
        if (!await this.$store.dispatch('addChat', { id: this.id, name: this.name })) {
          ipcRenderer.send('showChatWindow', { id: this.id })
        }
      }
    }
  },
  created () {
    ipcRenderer.on('videoUrl', (event, args) => {
      this.videoUrl = args.videoUrl
      this.playVideo(args.videoUrl)
    })

    ipcRenderer.on('hold', () => {
      this.userIsPaused = true
      this.player.pause()
    })

    ipcRenderer.on('resume', () => {
      this.userIsPaused = false
      this.player.play()
    })

    ipcRenderer.on('videoRefreshTimeout', (event, args) => {
      this.videoRefreshTimeout = args.videoRefreshTimeout
    })

    ipcRenderer.on('toggleControls', (event, args) => {
      this.player.controls(!this.player.controls())
    })

    ipcRenderer.on('reloadVideo', (event, args) => {
      this.playVideo(this.videoUrl)
    })

    ipcRenderer.on('resizeVideo', (event, args) => {
      // const video = this.$refs.videoPlayer.$el.querySelector('video')
      // if (video) {
      //   const w = video.videoWidth
      //   const h = video.videoHeight
      //   console.log({ w, h })
      remote.getCurrentWindow().setContentSize(480, 640)
      console.log(this.videoUrl)
      // ipcRenderer.send('setWindowSize', { id: this.id, w, h, forceResize: true })
      // }
    })

    ipcRenderer.on('roomEnded', () => {
      this.video.reset()
      this.videoEnded = true
      this.loaded = false
    })
  },
  mounted () {
    this.id = this.$route.params.id
    this.name = this.$route.params.name

    this.player = videojs(this.$refs.videoPlayer, this.playerOptions, function onPlayerReady () {
    })
    this.player.on('waiting', this.onPlayerWait)
    this.player.on('canplay', this.onPlayerCanplay)
    this.player.on('loadeddata', this.onPlayerLoadeddata)
    this.player.on('error', this.onPlayerError)
    this.player.on('timeupdate', this.onPlayerTimeupdate)

    ipcRenderer.send('getVideoUrl', this.id)
    ipcRenderer.send('getVideoRefreshTimeout')
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
