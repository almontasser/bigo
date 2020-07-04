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
      <b-spinner v-if="!noMediaFound" class="spinner" style="width: 3rem; height: 3rem;" label="Large Spinner"></b-spinner>
    </div>
    <video-player
      v-if="!noMediaFound"
      v-show="loaded"
      ref="videoPlayer"
      class="vjs-custom-skin"
      :options="playerOptions"
      @ready="onPlayerReady($event)"
      @play="onPlayerPlay($event)"
      @loadeddata="onPlayerLoadeddata($event)"
      @error="onPlayerError($event)"
    ></video-player>
  </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron'
import videojs from 'video.js'
window.videojs = videojs

// hls plugin for videojs6
require('videojs-contrib-hls/dist/videojs-contrib-hls.js')

export default {
  data () {
    return {
      id: 0,
      name: '',
      loaded: false,
      noMediaFound: false,
      videoUrl: '',
      previousTime: 0,
      playerOptions: {
        autoplay: true,
        fluid: true
      },
      videoFrameMenuOptions: [
        { id: 2, name: 'Reload' },
        { id: 0, name: 'Add to favorites' },
        { id: 1, name: 'Hide' }
      ]
    }
  },
  computed: {
    player () {
      if (this.$refs.videoPlayer) return this.$refs.videoPlayer.player
      else return null
    }
  },
  methods: {
    onPlayerLoadeddata () {
      const video = this.$refs.videoPlayer.$el.querySelector('video')
      if (video.addEventListener) {
        video.addEventListener('contextmenu', function (e) {
          e.preventDefault()
        }, false)
      } else {
        video.attachEvent('oncontextmenu', function () {
          window.event.returnValue = false
        })
      }

      const si = setInterval(() => {
        if (video.currentTime === this.previousTime) {
          clearInterval(si)

          this.playVideo(this.videoUrl)
          return
        }
        this.previousTime = video.currentTime
      }, 1000)

      const w = video.videoWidth
      const h = video.videoHeight

      ipcRenderer.send('setWindowSize', { id: this.id, w, h })

      this.loaded = true
    },
    onPlayerPlay () {},
    onPlayerReady () {},
    onPlayerError (event) {
      console.log(event)

      if (event.error() && event.error().code === 4) this.noMediaFound = true
    },
    playVideo: function (source) {
      const video = {
        withCredentials: false,
        type: 'application/x-mpegurl',
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
    optionClicked (event) {
      if (event.option.id === 0) {
        ipcRenderer.send('showFavDialog', event.item)
      } else if (event.option.id === 1) {
        ipcRenderer.send('closeVideo', event.item.id)
      } else if (event.option.id === 2) {
        remote.getCurrentWindow().reload()
      }
    }
  },
  created () {
    ipcRenderer.on('videoUrl', (event, args) => {
      this.videoUrl = args.videoUrl
      this.playVideo(args.videoUrl)
    })
  },
  mounted () {
    this.id = this.$route.params.id
    this.name = this.$route.params.name
    ipcRenderer.send('getVideoUrl', this.id)
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
</style>
