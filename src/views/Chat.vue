<template>
  <div>
    <p v-for="(chat, index) in chats" :key="index">{{chat}}</p>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      id: '',
      name: '',
      ws: null,
      chats: []
    }
  },
  created () {
    ipcRenderer.on('videoUrl', (event, args) => {
      console.log(args)

      this.wsUrl = args.wsUrl

      this.ws = new WebSocket(this.wsUrl)
      this.ws.addEventListener('message', (event) => {
        try {
          const j = JSON.parse(event.data)
          if (j[0].c !== 5) {
            this.chats.push(j)
          }
        } catch (error) {
        }
      })
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name
    ipcRenderer.send('getVideoUrl', this.id)
  }
}
</script>

<style>
#app {
  overflow: auto;
}
</style>
