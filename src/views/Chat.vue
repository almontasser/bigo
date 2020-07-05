<template>
  <div class="chat_box">
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
      chats: [],
      chatContentType: {
        type1: '<li><p class="room_notice public_notice">===</p></li>',
        type2: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">===</span></li>',
        type3: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">shared this LIVE</span></li>',
        type4: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">sent<img src="/images/gift/like.png"></span></li>',
        type5: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">became a Fan.Won\'t miss the next LIVE</span></li>',
        type6: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">sent a&nbsp;===&nbsp;===&nbsp;X===</span></li>'
      },
      giftJSONLikeArr: []
    }
  },
  methods: {
    switchGradeToColor (lev) {
      const arrColor = ['#78dbc7', '#6bc9e3', '#799bec', '#a28ded', '#da8dee', '#f393d9', '#fd9ebd', '#fd809e', '#f26283']
      var index = 0
      if (lev <= 33) {
        if (lev <= 11) {
          index = 1
        } else if (lev <= 22) {
          index = 2
        } else {
          index = 3
        }
      } else if (lev <= 55) {
        if (lev <= 44) {
          index = 4
        } else {
          index = 5
        }
      } else if (lev <= 77) {
        if (lev <= 66) {
          index = 6
        } else {
          index = 7
        }
      } else {
        if (lev <= 88) {
          index = 8
        } else {
          index = 9
        }
      }
      return arrColor[index]
    },
    switchGiftCodeToURL (giftCode) {
      var allGiftArr = this.giftJSONLikeArr
      var targetGift = {}
      targetGift.name = 'gift'
      targetGift.url = '/images/favicon.ico'
      for (var i = 0, len = allGiftArr.length; i < len; i++) {
        if (+allGiftArr[i].typeid === +giftCode) {
          targetGift.url = allGiftArr[i].img_url
          targetGift.name = allGiftArr[i].name
          return targetGift
        }
      }
      return targetGift
    },
    joinUrlAndNameToGiftIcon (iconNumber) {
      return '<img src="' + this.switchGiftCodeToURL(iconNumber).url + '" />'
    },
    joinEveryWords (obj) {
      let allWords = ''
      switch (obj.c) {
        case 0:
          // Room End
          break
        case 1:
          allWords = this.chatContentType.type2
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.n)
            .replace('===', obj.data.m.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          break
        case 2:
          allWords = this.chatContentType.type1
            .replace('===', 'Broadcaster will leave for a moment. Please hold on')
          break
        case 3:
          allWords = this.chatContentType.type1
            .replace('===', 'Broadcaster is back. LIVE is recovering')
          break
        case 4:
          allWords = this.chatContentType.type3
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.m)
          break
        case 5:
          // this.updataLiveCount(obj.data.m);
          break
        case 6:
          break
        case 7:
          break
        case 8:
          allWords = this.chatContentType.type6
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.n)
            .replace('===', this.switchGiftCodeToURL(obj.data.m).name)
            .replace('===', this.joinUrlAndNameToGiftIcon(obj.data.m))
            .replace('===', obj.data.c)
          break
        case 9:
          allWords = this.chatContentType.type4
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.n)
          break
        case 10:
          allWords = this.chatContentType.type5
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.m)
          break
        case 11:
          allWords = this.chatContentType.type1
            .replace('===', obj.data.m)
          break
        case 12:
          allWords = this.chatContentType.type2
            .replace('===', this.switchGradeToColor(obj.grade))
            .replace('===', obj.grade)
            .replace('===', obj.data.n)
            .replace('===', obj.data.m.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          break
        case 13:
          // giftAnimationObject.giftAnimationStart(obj)
          // this.updataBeans(obj.ticket)
          break
        case 14:
          break
      }
      return allWords
    }
  },
  created () {
    ipcRenderer.on('videoUrl', (event, args) => {
      this.wsUrl = args.wsUrl

      this.ws = new WebSocket(this.wsUrl)
      this.ws.addEventListener('message', (event) => {
        try {
          // const j = JSON.parse(event.data)
          // if (j[0].c !== 5) {
          //   this.chats.push(j)
          // }
          const arr = JSON.parse(event.data)
          const arrLength = arr.length
          let allWords = ''
          for (let i = arrLength - 1; i >= 0; i--) {
            allWords += this.joinEveryWords(arr[i])
          }
          if (allWords) {
            this.chats.push(allWords)
            // console.log('scroll')
            // const list = this.$refs.chatBox
            // list.scrollTop = list.clientHeight
          }
        } catch (error) {
        }
      })
    })

    ipcRenderer.on('giftJSONLikeArr', (event, args) => {
      this.giftJSONLikeArr = args
    })
  },
  mounted () {
    this.id = this.$route.query.id
    this.name = this.$route.query.name
    ipcRenderer.send('getVideoUrl', this.id)
    ipcRenderer.send('getGiftJSONLikeArr')
  }
}
</script>

<style scoped>
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

#app {
  overflow: auto;
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
