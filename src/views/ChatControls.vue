<template>
  <div>
    <b-button size="sm" variant="light" :squared="true" @click="increaseFontSize"><b-icon icon="plus-circle"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="decreaseFontSize"><b-icon icon="dash-circle"></b-icon></b-button>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      id: 0,
      ideoRefreshTimeout: 0
    }
  },
  methods: {
    increaseFontSize () {
      ipcRenderer.send('increaseFontSize', { id: this.id })
    },
    decreaseFontSize () {
      ipcRenderer.send('decreaseFontSize', { id: this.id })
    }
  },
  mounted () {
    this.id = this.$route.query.id
  }
}
</script>

<style>

</style>
