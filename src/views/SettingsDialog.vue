<template>
  <b-form @submit="onSubmit" @keydown="onKeypress" style="padding: 20px">
    <b-form-group
        id="timeout-group"
        label="Refresh Timeout:"
        label-for="timeoutInput"
      >
        <b-form-input
          id="timeoutInput"
          v-model="timeout"
          type="text"
          required
          placeholder="Enter Refresh Timeout"
        ></b-form-input>
      </b-form-group>
      <b-button type="submit" variant="primary" class="mr-2">Save</b-button>
      <b-button type="reset" variant="danger" @click="close">Cancel</b-button>
  </b-form>
</template>

<script>
import { remote, ipcRenderer } from 'electron'

export default {
  data () {
    return {
      timeout: 5000
    }
  },
  methods: {
    close () {
      remote.getCurrentWindow().close()
    },
    onSubmit () {
      ipcRenderer.send('setVideoRefreshTimeout', { videoRefreshTimeout: this.timeout })
      this.close()
    },
    onKeypress (event) {
      if (event.keyCode === 27) {
        this.close()
      }
    }
  },
  created () {
    ipcRenderer.on('videoRefreshTimeout', (event, args) => {
      this.timeout = args.videoRefreshTimeout
    })
  },
  mounted () {
    ipcRenderer.send('getVideoRefreshTimeout')
  }
}
</script>

<style>

</style>
