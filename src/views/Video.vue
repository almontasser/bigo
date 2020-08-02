<template>
  <div style="height: 100%" @contextmenu.prevent="$refs.menu.open">
    <vue-context ref="menu">
      <li><a @click.prevent="onReloadClick()">Reload</a></li>
      <li><a @click.prevent="onOpenChatClick()">Open chat</a></li>
      <li><a @click.prevent="onAddToFavClick()">Add to favorites</a></li>
      <li><a @click.prevent="onHideClick()">Hide</a></li>
    </vue-context>
    <video-player :id="id" :name="name" :videoUrl="videoUrl" :videoRefreshTimeout="videoRefreshTimeout"></video-player>
  </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron'
import VueContext from 'vue-context'
import VideoPlayer from '@/components/VideoPlayer.vue'

export default {
  data () {
    return {
      id: 0,
      name: '',
      videoUrl: '',
      videoRefreshTimeout: 5000
    }
  },
  components: {
    VueContext,
    VideoPlayer
  },
  methods: {
    onReloadClick () {
      remote.getCurrentWindow().reload()
    },
    async onOpenChatClick () {
      if (!await this.$store.dispatch('addChat', { id: this.id, name: this.name })) {
        ipcRenderer.send('showChatWindow', { id: this.id })
      }
    },
    onAddToFavClick () {
      ipcRenderer.send('showFavDialog', { id: this.id, name: this.name })
    },
    onHideClick () {
      ipcRenderer.send('closeVideo', { id: this.id })
    }
  },
  created () {
    ipcRenderer.on('videoUrl', (event, args) => {
      this.videoUrl = args.videoUrl
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
      // this.playVideo(this.videoUrl)
    })

    ipcRenderer.on('resizeVideo', (event, args) => {
      remote.getCurrentWindow().setContentSize(480, 640)
    })

    ipcRenderer.on('roomEnded', () => {
      this.video.reset()
      this.videoEnded = true
      this.loaded = false
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name

    ipcRenderer.send('getVideoUrl', this.id)
    ipcRenderer.send('getVideoRefreshTimeout')
  }
}
</script>

<style>

</style>
