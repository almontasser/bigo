<template>
  <div class="videos" style="height: 100%;">
    <vue-context ref="menu">
      <template slot-scope="child">
        <li><a @click.prevent="onReloadClick($event, child.data)">Reload</a></li>
        <li><a @click.prevent="onOpenChatClick($event, child.data)">Open chat</a></li>
        <li><a @click.prevent="onAddToFavClick($event, child.data)">Add to favorites</a></li>
        <li><a @click.prevent="onHideClick($event, child.data)">Hide</a></li>
      </template>
    </vue-context>
    <div class="video" v-if="video1.id" @contextmenu.prevent="$refs.menu.open($event, { id: video1.id, name: video1.name, target: 'video1' })">
      <video-player
        :id="video1.id"
        ref="video1"
        :name="video1.name"
        :videoUrl="video1.videoUrl"
        :videoRefreshTimeout="videoRefreshTimeout"
      ></video-player>
    </div>
    <div class="video" v-if="video2.id" @contextmenu.prevent="$refs.menu.open($event, { id: video2.id, name: video2.name, target: 'video2' })">
      <video-player
        :id="video2.id"
        ref="video2"
        :name="video2.name"
        :videoUrl="video2.videoUrl"
        :videoRefreshTimeout="videoRefreshTimeout"
      ></video-player>
    </div>
    <div class="video loadingVideo" v-if="loadingVid2 || !video1.id">
      <b-spinner class="spinner" style="width: 3rem; height: 3rem;" label="Large Spinner"></b-spinner>
    </div>
  </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron'
import VideoPlayer from '@/components/VideoPlayer.vue'
import VueContext from 'vue-context'

export default {
  components: { VideoPlayer, VueContext },
  data () {
    return {
      video1: {
        id: 0,
        name: '',
        videoUrl: ''
      },
      video2: {
        id: 0,
        name: '',
        videoUrl: ''
      },
      loadingVid2: false,
      videoRefreshTimeout: 5000
    }
  },
  methods: {
    onReloadClick (event, args) {
      this.$refs[args.target].reload()
    },
    async onOpenChatClick ($e, data) {
      const { id, name } = data
      if (!await this.$store.dispatch('addChat', { id, name })) {
        ipcRenderer.send('showChatWindow', { id })
      }
    },
    onAddToFavClick (event, args) {
      ipcRenderer.send('showFavDialog', { id: args.id, name: args.name })
    },
    onHideClick (event, args) {
      if (args.target === 'video2') {
        ipcRenderer.send('deattachVideo', { parentId: this.video1.id, id: this.video2.id })
      } else {
        ipcRenderer.send('closeVideo', { id: args.id })
      }
    },
    getVideoById (id) {
      let video = null
      if (id === this.video1.id) {
        video = this.$refs.video1
      } else if (id === this.video2.id) {
        video = this.$refs.video2
      }
      return video
    }
  },
  created () {
    ipcRenderer.on('videoRefreshTimeout', (event, args) => {
      this.videoRefreshTimeout = args.videoRefreshTimeout
    })

    ipcRenderer.on('resizeVideo', (event, args) => {
      const width = this.video2.id ? 960 : 480
      remote.getCurrentWindow().setContentSize(width, 640)
    })

    ipcRenderer.on('videoRoomDetails', (event, args) => {
      if (args.id !== this.video1.id && args.videoUrl !== this.video1.videoUrl) {
        this.video1 = {
          id: args.id,
          name: args.name,
          videoUrl: args.videoUrl
        }
      }
      if (args.id2) {
        this.loadingVid2 = false
      }
      this.video2 = {
        id: args.id2,
        name: args.name2,
        videoUrl: args.videoUrl2
      }
    })

    ipcRenderer.on('toggleControls', (event, args) => {
      this.$refs.video1.toggleControls()
      this.$refs.video2.toggleControls()
    })

    ipcRenderer.on('hold', (event, args) => {
      const video = this.getVideoById(args.id)
      if (video) {
        video.userPaused()
      }
    })

    ipcRenderer.on('resume', (event, args) => {
      const video = this.getVideoById(args.id)
      if (video) {
        video.userResumed()
      }
    })

    ipcRenderer.on('roomEnded', (event, args) => {
      const video = this.getVideoById(args.id)
      if (video) {
        video.roomEnded()
      }
    })

    ipcRenderer.on('loadingVid2', () => {
      this.loadingVid2 = true
    })
  },
  mounted () {
    ipcRenderer.send('getVideoRoomDetails', { id: this.$route.query.id })
    ipcRenderer.send('getVideoRefreshTimeout')
  }
}
</script>

<style>
.videos {
  display: flex;
}

.video {
  flex: 1 0 50%;
}

.loadingVideo {
  background-color: black;
}

.loadingVideo {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  height: 100%;
}

.loadingVideo .spinner {
  color: white;
}

</style>
