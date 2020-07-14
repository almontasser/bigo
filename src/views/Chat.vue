<template>
  <div class="chat_box">
    <ul class="chat_list" :style="{ 'font-size': fontSize + 'px' }" ref="chatList" v-chat-scroll="{always: false, smooth: false}" @scroll="onChatListScroll">
      <span v-for="(chat, index) in chats" :key="index" v-html="chat"></span>
    </ul>
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
      ws: null,
      chats: [],
      chatList: null,
      scrollDownVisible: false,
      fontSize: 14
    }
  },
  methods: {
    onChatListScroll () {
      this.scrollDownVisible = this.chatList.scrollTop < this.chatList.scrollHeight - this.chatList.clientHeight
    },
    onScrollDownClick () {
      this.chatList.scrollTop = this.chatList.scrollHeight
    }
  },
  created () {
    ipcRenderer.on('message', (event, args) => {
      // const chatBox = this.$refs.chatBox
      // console.log('scrollTop: ' + chatBox.scrollTop)
      // console.log('\nscrollHeight: ' + chatBox.scrollHeight)
      // const shuldScroll = chatBox.scrollTop === chatBox.scrollHeight - chatBox.clientHeight
      this.chats.push(args)
      // if (shuldScroll) {
      //   this.$nextTick(() => {
      //     chatBox.scrollTop = chatBox.scrollHeight
      //   })
      // }
    })

    ipcRenderer.on('roomEnded', () => {
      this.chats.push('ROOM ENDED')
    })

    ipcRenderer.on('decreaseFontSize', (event, args) => {
      this.fontSize = this.fontSize - 1
    })

    ipcRenderer.on('increaseFontSize', (event, args) => {
      this.fontSize = this.fontSize + 1
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name
    this.chatList = this.$refs.chatList
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
}

.chat_list {
  overflow: auto;
  height: 100%;
}

.chat_list img{
  vertical-align: middle;
  margin: 0px 5px;
  max-height: 40px;
}

.chat_list .user_grade{
  display: inline-block;
  /*position: absolute;
  left: 0;
  top: 0;*/
  margin-left: -25px;
  margin-right: 5px;
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
  /* padding-left: 25px; */
  /* width: 285px; */
  list-style: none;
}
.chat_list .user_text_content{
  font-size: 1.2em;
  color: #666666;
  /*word-break: break-all;*/
  font-family: 'sans_300';
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
  right: 25px;
  bottom: 10px;
}

</style>
