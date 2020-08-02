<template>
  <div class="p-2">
    <b-button size="sm" class="mb-2" @click="onLoginClick"><b-icon icon="person-circle"></b-icon> Login</b-button>
    <b-list-group>
      <b-list-group-item v-for="account of accounts" :key="account.yyuid">
        <img style="width: 45px; height: 45px; overflow: hidden; border-radius: 45px; margin-right: 10px; box-shadow: 0px 0px 1px #000;" :src="decodeURIComponent(account.head_icon_url)" />
        {{ account.nick_name }}
      </b-list-group-item>
    </b-list-group>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      accounts: []
    }
  },
  methods: {
    onLoginClick () {
      ipcRenderer.send('showLogin')
    }
  },
  created () {
    ipcRenderer.on('accounts', (event, args) => {
      this.accounts = args.accounts
    })
  },
  mounted () {
    ipcRenderer.send('getAccounts')
  }
}
</script>

<style>

</style>
