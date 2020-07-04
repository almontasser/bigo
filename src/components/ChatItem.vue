<template>
  <div></div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  props: ['id', 'name'],
  mounted () {
    ipcRenderer.send('createChatWindow', { id: this.id, name: this.name })
  }
}
</script>

<style>
</style>
