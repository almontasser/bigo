<template>
  <div>
    <b-button size="sm" variant="light" :squared="true" @click="reloadVideoClick"><b-icon icon="arrow-clockwise"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="resizeVideo"><b-icon icon="arrows-fullscreen"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="toggleControlsClick"><b-icon icon="caret-right-fill"></b-icon></b-button>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      id: null
    }
  },
  methods: {
    reloadVideoClick () {
      ipcRenderer.send('reloadVideo', { id: this.id })
    },
    resizeVideo () {
      ipcRenderer.send('resizeVideo', { id: this.id })
    },
    toggleControlsClick () {
      ipcRenderer.send('toggleControls', { id: this.id })
    }
  },
  mounted () {
    this.id = this.$route.query.id
  }
}
</script>

<style>

</style>
