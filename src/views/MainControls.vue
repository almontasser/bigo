<template>
  <div>
    <b-button size="sm" variant="light" :squared="true" @click="reloadAllVideosClick"><b-icon icon="arrow-clockwise"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="settingsClick"><b-icon icon="gear-fill"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="accountsClick"><b-icon icon="person-circle"></b-icon></b-button>
    <b-button size="sm" variant="light" :squared="true" @click="googleClick" style="margin-top: -4px;"><img width="14px" src="/images/google.png"/></b-button>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      ideoRefreshTimeout: 0
    }
  },
  methods: {
    reloadAllVideosClick () {
      ipcRenderer.send('reloadAll')
    },
    settingsClick () {
      ipcRenderer.send('showSettings')
    },
    accountsClick () {
      ipcRenderer.send('showAccounts')
    },
    googleClick () {
      ipcRenderer.send('showGoogle')
    }
  }
}
</script>

<style>

</style>
