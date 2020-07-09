<template>
  <div class="chat_box" ref="chatBox">
    <ul class="chat_list">
      <span v-for="(chat, index) in chats" :key="index" v-html="chat"></span>
    </ul>
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
    ipcRenderer.on('message', (event, args) => {
      const chatBox = this.$refs.chatBox
      console.log('scrollTop: ' + chatBox.scrollTop)
      console.log('\nscrollHeight: ' + chatBox.scrollHeight)
      const shuldScroll = chatBox.scrollTop === chatBox.scrollHeight - chatBox.clientHeight
      this.chats.push(args)
      if (shuldScroll) {
        this.$nextTick(() => {
          chatBox.scrollTop = chatBox.scrollHeight
        })
      }
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name
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
  width: 20px;
  height: 20px;
  border-radius: 20px;
  background: #00ddcc;
  color: #fff;
  text-align: center;
  line-height: 20px;
  font-size: 13px;
}
.chat_list .user_name{
  font-size: 14px;
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
  font-size: 14px;
  color: #666666;
  /*word-break: break-all;*/
  font-family: 'sans_300';
}
.chat_list .room_notice{
  font-size: 14px;
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
  font-size: 16px;
  color: #666;
}
</style>
