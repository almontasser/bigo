<template>
  <div></div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  props: ['id', 'name'],
  mounted () {
    ipcRenderer.send('createVideoWindow', { id: this.id, name: this.name })
  }
}
</script>

<style>
</style>
