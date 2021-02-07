<template>
  <div class="chat_box">
    <ul class="chat_list" :style="{ 'font-size': fontSize + 'px' }" ref="chatList" v-chat-scroll="{always: false, smooth: false}" @scroll="onChatListScroll">
      <span v-for="(chat, index) in chats" :key="index" v-html="chat"></span>
      <span v-if="!online"><li><h3>USER IS OFFLINE</h3></li></span>
    </ul>
    <b-form v-if="online" class="my-2 mx-1 row" id="chat_text" @submit="sendMessage">
      <b-col md="auto" class="px-1">
        <b-button @click="onLoginClick"><b-icon icon="person-circle"></b-icon></b-button>
      </b-col>
      <b-col md="auto" class="px-1">
        <b-form-select
          v-model="account"
          :options="accountOptions"
          @change="onAccountChange"
        ></b-form-select>
      </b-col>
      <b-col class="px-1">
        <b-form-input class="" width="auto" v-model="text"></b-form-input>
      </b-col>
      <b-col md="auto" class="px-1">
        <b-button variant="primary" type="submit">Submit</b-button>
      </b-col>
    </b-form>
    <b-button
      v-show="scrollDownVisible"
      id="scrollDown"
      size="lg"
      variant="light"
      :squared="true"
      @click="onScrollDownClick"
      >
        <b-icon icon="arrow-down-square-fill"></b-icon>
      </b-button>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      id: '',
      name: '',
      chats: [],
      chatList: null,
      scrollDownVisible: false,
      fontSize: 14,
      accounts: [],
      account: null,
      text: '',
      online: true,
      waitingMessageConfirmation: false
    }
  },
  methods: {
    onChatListScroll () {
      this.scrollDownVisible = this.chatList.scrollTop < this.chatList.scrollHeight - this.chatList.clientHeight
    },
    onScrollDownClick () {
      this.chatList.scrollTop = this.chatList.scrollHeight
    },
    sendMessage (event) {
      event.preventDefault()
      if (!this.account || !this.text) return

      this.waitingMessageConfirmation = true
      ipcRenderer.send('sendMessage', { id: this.id, account: this.account, text: this.text })
    },
    onAccountChange (value) {
      ipcRenderer.send('joinGroup', { id: this.id, account: this.account })
    },
    onLoginClick () {
      this.account = null
      ipcRenderer.send('showLogin')
    }
  },
  computed: {
    accountOptions () {
      return [
        { text: 'Select Account', value: null },
        ...this.accounts.map(account => {
          let text = account.nick_name
          if (account.logedIn === false) text = '❌ ' + text
          else if (account.logedIn === true) text = '✅ ' + text
          return { text, value: account.yyuid }
        })
      ]
    }
  },
  created () {
    ipcRenderer.on('message', (event, args) => {
      this.chats.push(args)
    })

    ipcRenderer.on('roomEnded', () => {
      this.online = false
      this.chats.push('ROOM ENDED')
    })

    ipcRenderer.on('decreaseFontSize', (event, args) => {
      this.fontSize = this.fontSize - 1
    })

    ipcRenderer.on('increaseFontSize', (event, args) => {
      this.fontSize = this.fontSize + 1
    })

    ipcRenderer.on('accounts', (event, args) => {
      this.accounts = args.accounts
    })

    ipcRenderer.on('accountStatus', (event, args) => {
      if (this.waitingMessageConfirmation) {
        if (args.logedIn) this.text = ''
        this.waitingMessageConfirmation = false
      }
      this.accounts = this.accounts.map(account => {
        if (account.yyuid === args.account) return { ...account, logedIn: args.logedIn }
        else return account
      })
    })

    ipcRenderer.on('roomStatus', (event, args) => {
      this.online = args.online
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name
    this.chatList = this.$refs.chatList
    ipcRenderer.send('getAccounts')
    ipcRenderer.send('getRoomStatus', { id: this.id })
  }
}
</script>

<style>
@font-face {
    font-family: 'sans_100';
    src:url('/museosans-100.woff2') format('woff2'),
         url('/museosans-100.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'sans_300';
    src:url('/museosans-300.woff2') format('woff2'),
         url('/museosans-300.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'sans_500';
    src:url('/museosans-500.woff2') format('woff2'),
         url('/museosans-500.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}

.chat_box {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat_list {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  direction: rtl;
}

.chat_list img{
  vertical-align: middle;
  margin: 0px 5px;
  max-height: 40px;
}

.chat_list span li {
  display: flex;
  align-items: baseline;
}

.chat_list .user_grade{
  display: inline-block;
  margin-right: -25px;
  margin-left: 5px;
}
.chat_list .grade_num{
  display: block;
  width: 1.4em;
  height: 1.4em;
  border-radius: 1.4em;
  background: #00ddcc;
  color: #fff;
  text-align: center;
  line-height: 1.5em;
  font-size: 1.2em;
}
.chat_list .user_name{
  font-size: 1.2em;
  font-family: 'sans_500';
  color: #2e2e2e;
  margin:0 5px 0 0;
  line-height: 18px;
}
.chat_list li{
  margin-bottom: 10px;
  position: relative;
  list-style: none;
}
.chat_list .user_text_content{
  font-size: 1.2em;
  color: #666666;
  font-family: 'sans_300';
  text-align: right;
  word-wrap: break-word;
}
.chat_list .room_notice{
  font-size: 1.2em;
  color: #00ddcc;
  font-family: 'sans_500';
}
.chat_list .public_notice {
  width: 310px;
  position: relative;
  left: -20px;
  padding-top: 10px;
}
.chat_list .name_dot_chat{
  font-family: 'sans_500';
  font-size: 1.4em;
  color: #666;
}

#scrollDown {
  position: absolute;
  left: 25px;
  bottom: 60px;
}

</style>
