<template>
  <div class="home">
    <div style="display:none;">
      <video-item v-for="video in videos" :key="'v' + video.id" :id="video.id" :name="video.name"></video-item>
      <chat-item v-for="chat in chats" :key="'c' + chat.id" :id="chat.id" :name="chat.name"></chat-item>
    </div>
    <div class="favs px-3 py-2">
      <h3>Favorites</h3>
      <vue-simple-context-menu
          :elementId="'favsMenu'"
          :options="favsMenuOptions"
          :ref="'favsMenu'"
          @option-clicked="favsOptionClicked"
        />
        <b-form-input class="my-2" v-model="favsSearch" placeholder="Search"></b-form-input>
        <b-button size="sm" class="mb-2" @click="addFavDialog"><b-icon icon="person-plus-fill"></b-icon> Add User</b-button>
        <b-button size="sm" class="mb-2 ml-2" @click="refreshFavList"><b-icon icon="arrow-clockwise"></b-icon> Refresh</b-button>
        <b-list-group>
          <b-list-group-item class="d-flex align-items-center" href="#" v-for="user in filteredFavs" :key="user.id" v-on:click="addVideo(user.id, user.customName); favsSidebarVisible=false" @contextmenu.prevent.stop="handleFavsRightClick($event, user)">
            <b-img rounded="circle" width=42 height=42 :src="user.thumb_img" style="margin-right: 10px;"></b-img>
            <p style="margin-bottom: 0;">
            <span class="user-name">{{user.customName}}</span><br/>
            <span class="user-id">ID: {{user.id}}</span>
            <span class="user-views">Views: {{user.viewers}}</span>
            </p>
            <b-spinner v-if="user.updating" small label="Spinning" style="margin-left: auto; color: lightgreen;"></b-spinner>
            <b-badge v-if="!user.updating && user.live" style="margin-left: auto; background-color: lightgreen; color: lightgreen;" pill>.</b-badge>
          </b-list-group-item>
        </b-list-group>
    </div>
    <div class="users px-3 py-2">
      <h3>Live Users</h3>
      <b-form inline class="mb-2">
          <b-form-input  v-model="usersSearch" placeholder="Search"></b-form-input>
          <v-select class="ml-2" v-model="usersCountry" :options="countries" @input="usersCountryChanged"></v-select>
          <b-button size="sm" class="ml-2" @click="refreshUsers"><b-icon icon="arrow-clockwise"></b-icon> Refresh</b-button>
      </b-form>
      <vue-simple-context-menu
        :elementId="'usersMenu'"
        :options="usersMenuOptions"
        :ref="'usersMenu'"
        @option-clicked="usersOptionClicked"
      />
      <ul style="padding-left: 0; margin-right: -10px;">
        <li class="room_item" v-for="user in filteredUsers" :key="user.bigo_id" @contextmenu.prevent.stop="handleUsersRightClick($event, user)">
          <a href="#" v-on:click="addVideo(user.bigo_id, user.nick_name); usersSidebarVisible=false">
            <div class="host_photo">
              <div class="image_shadow"></div>
              <img :src="user.cover_l" alt="">
            </div>
            <div class="recom_hover">
              <p class="room_name">{{user.room_topic}}</p>
              <div class="hosts_name_box">
                <i class="hosts_name">
                  <p class="text_name">
                    {{user.nick_name}}
                    <br/>
                    {{user.bigo_id}}
                  </p>
                </i>
                <i class="viewer_num"><b-icon icon="people-fill"></b-icon> {{user.user_count}}</i>
              </div>
            </div>
          </a>
        </li>
        <infinite-loading ref="infiniteLoader" spinner="waveDots" @infinite="infiniteHandler"></infinite-loading>
      </ul>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import VideoItem from '@/components/VideoItem.vue'
import ChatItem from '@/components/ChatItem.vue'
import { ipcRenderer } from 'electron'
import { mapState } from 'vuex'
import smalltalk from 'smalltalk'

export default {
  name: 'Home',
  data: function () {
    return {
      usersSidebarVisible: false,
      usersSearch: '',
      countries: [],
      usersCountry: { code: 'SA', label: 'Saudi Arabia' },
      users: [],
      usersInfiniteLoaderState: null,
      usersMenuOptions: [
        { id: 0, name: 'Add to favorites' },
        { id: 1, name: 'Open Chat' }
      ],
      favsSidebarVisible: false,
      favsSearch: '',
      favs: [],
      favsMenuOptions: [
        { id: 2, name: 'Open Chat' },
        { id: 0, name: 'Edit' },
        { id: 1, name: 'Delete' }
      ],
      videoRefreshTimeout: 0,
      showingSettings: false
    }
  },
  computed: {
    ...mapState(['videos', 'chats']),
    filteredUsers () {
      return this.users.filter(user => user.nick_name && user.nick_name.indexOf(this.usersSearch) > -1)
    },
    tabType () {
      if (this.usersCountry) {
        return this.usersCountry.code
      } else {
        return 'ALL'
      }
    },
    filteredFavs () {
      let filtered
      if (this.favsSearch) filtered = this.favs.filter(user => user.customName && user.customName.indexOf(this.favsSearch) > -1)
      else filtered = this.favs
      return filtered.sort((a, b) => b.viewers - a.viewers)
    }
  },
  components: {
    VideoItem,
    ChatItem
  },
  methods: {
    // openVideo (id, name) {
    //   if (id && !this.videos.find(i => i.id === id)) {
    //     this.videos.push({ id, name })
    //   }
    // },
    async addVideo (id, name) {
      if (!await this.$store.dispatch('addVideo', { id, name })) {
        ipcRenderer.send('showVideoWindow', { id: id })
      }
    },
    // toggleUsersSidebar () {
    //   this.users = []
    //   this.usersSidebarVisible = true
    //   this.$refs.infiniteLoader.$emit('$InfiniteLoading:reset')
    // },
    refreshUsers () {
      this.users = []
      this.$refs.infiniteLoader.$emit('$InfiniteLoading:reset')
    },
    async usersCountryChanged () {
      this.users = []
      this.$refs.infiniteLoader.$emit('$InfiniteLoading:reset')
      // const res = await axios.post('http://localhost:3000/users', {body: `ignoreUids=1578156944&tabType=${this.tabType}`})
      // this.users = res.data
    },
    async infiniteHandler ($state) {
      const ignore = this.users.reduce((a, b) => a + '.' + b.owner, '1578156944')
      // const res = await axios.post('http://localhost:3000/users', {body: `ignoreUids=${ignore}&tabType=${this.tabType}`})
      const args = `ignoreUids=${ignore}&tabType=${this.tabType}`
      this.usersInfiniteLoaderState = $state
      ipcRenderer.send('getUsers', args)
    },
    handleUsersRightClick (event, item) {
      this.$refs.usersMenu.showMenu(event, item)
    },
    async usersOptionClicked (event) {
      if (event.option.id === 0) {
        ipcRenderer.send('showFavDialog', { id: event.item.bigo_id, name: event.item.nick_name })
      }
      if (event.option.id === 1) {
        if (!await this.$store.dispatch('addChat', { id: event.item.bigo_id, name: event.item.nick_name })) {
          ipcRenderer.send('showChatWindow', { id: event.item.bigo_id })
        }
      }
    },
    addFavDialog () {
      ipcRenderer.send('showFavDialog', { id: '', name: '' })
    },
    fetchFavsList () {
      ipcRenderer.send('getFavs')
    },
    refreshFavList () {
      this.favs = this.favs.map(fav => ({ ...fav, updating: true }))
      ipcRenderer.send('refreshFavs')
    },
    toggleFavsSidebar () {
      this.fetchFavsList()
      this.favsSidebarVisible = true
    },
    async favsOptionClicked (event) {
      if (event.option.id === 0) {
        ipcRenderer.send('showFavDialog', { id: event.item.id, name: event.item.customName, edit: event.item.id })
      }
      if (event.option.id === 1) {
        ipcRenderer.send('deleteFav', { id: event.item.id })
      }
      if (event.option.id === 2) {
        if (!await this.$store.dispatch('addChat', { id: event.item.id, name: event.item.customName })) {
          ipcRenderer.send('showChatWindow', { id: event.item.id })
        }
      }
    },
    handleFavsRightClick (event, item) {
      this.$refs.favsMenu.showMenu(event, item)
    }
  },
  created () {
    ipcRenderer.on('countries', (event, args) => {
      this.countries = args
    })

    ipcRenderer.on('users', (event, args) => {
      if (!this.usersInfiniteLoaderState) return

      const ids = new Set(this.users.map(u => u.bigo_id))
      if (args && args.length) {
        this.users = [...this.users, ...args.filter(u => !ids.has(u.bigo_id))]
        this.usersInfiniteLoaderState.loaded()
      } else {
        this.usersInfiniteLoaderState.complete()
      }
      this.usersInfiniteLoaderState = null
    })

    ipcRenderer.on('removeVideo', (event, args) => {
      this.$store.dispatch('removeVideo', { id: args })
    })

    ipcRenderer.on('removeChat', (event, args) => {
      this.$store.dispatch('removeChat', { id: args })
    })

    ipcRenderer.on('favs', (event, args) => {
      this.favs = args.favs
    })

    ipcRenderer.on('fav', (event, args) => {
      this.favs = this.favs.map(fav => {
        if (fav.id === args.id) return args
        return fav
      })
    })

    ipcRenderer.on('showSettings', (event, args) => {
      if (!this.showingSettings) {
        this.showingSettings = true
        smalltalk
          .prompt('Vide Refresh Timeout', 'Enter Video Refresh Timeout', this.videoRefreshTimeout)
          .then((value) => {
            ipcRenderer.send('setVideoRefreshTimeout', { videoRefreshTimeout: parseInt(value) })
            this.showingSettings = false
          })
          .catch(() => {
            this.showingSettings = false
          })
      }
    })

    ipcRenderer.on('videoRefreshTimeout', (event, args) => {
      this.videoRefreshTimeout = args.videoRefreshTimeout
    })
  },
  async mounted () {
    this.fetchFavsList()
    ipcRenderer.send('getCountries')
    ipcRenderer.send('getVideoRefreshTimeout')
  }
}
</script>

<style>

input {
  line-height: 1.5em !important;
}

.vs__dropdown-toggle {
  padding-top: 3px;
  padding-bottom: 3px;
  width: 300px;
}

.home {
  display: flex;
  height: 100%;
}

.favs {
  flex: 0 0 429px;
  overflow: auto;
  /* height: 100%; */
}

.users {
  flex-grow: 1;
  overflow: auto;
}

#floating-btn1 {
  right: 20px;
  bottom: 20px;
}

#floating-btn2 {
  right: 20px;
  bottom: 80px;
}

#floating-btn3 {
  right: 20px;
  bottom: 140px;
}

.floating-btn {
  width: 3rem;
  height: 3rem;
  line-height: 3rem;
  text-align: center;
  padding: 0;
  margin: 0;
  font-family: sans-serif;
  z-index: 1000;
  position: absolute;
  border: none;
  display: inline-block;
  vertical-align: middle;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  background-color: inherit;
  text-align: center;
  cursor: pointer;
  white-space: nowrap;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  font-size: 24px !important;
  border-radius: 50%;
  transition: opacity 0s;
  color: #000 !important;
  background-color: #9e9e9e !important;
}

.floating-btn:hover {
  color: #000 !important;
  background-color: #ccc !important;
  text-decoration: none;
}

.floating-btn:active {
  opacity: 0.5;
}

.vdr {
  border: none !important;
}

.user-id {
  font-size: 10px;
  margin-right: 5px;
}

.user-views {
  font-size: 10px;
}

.room_item {
  display: block;
  float: left;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
  width: 242px !important;
  height: 232px !important;
}

.room_item a {
  margin-right: 10px;
}

.room_item a, .room_item img {
    display: block;
    height: 100%;
}

.room_item img {
    width: 100%;
}

.hosts_photo {
    height: 232.5px !important;
}

.room_item .hosts_photo {
  width: 100%;
  position: relative;
  overflow: hidden;
  background: url(/bigo_auto.png) center top no-repeat;
  background-size: 100% auto;
  border-radius: 3px;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
}

.recom_hover {
  position: absolute;
  left: 0px;
  bottom: 0px;
  right: 10px;
  height: 100px;
  padding-top: 55px;
  z-index: 9;
  overflow: hidden;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background: url(/images/opa.png) center top no-repeat;
}

.recom_hover .room_name {
  margin-top: -20px;
  padding: 0 10px;
  color: #fff;
  font-size: 14px;
  font-style: normal;
}

p {
  margin: 0;
}

.hosts_name_box {
  position: absolute;
  left: 0px;
  bottom: 0px;
  height: 40px;
  background: #fff;
  width: 100%;
  padding: 10px 0 0;
}

.recom_hover .hosts_name {
  margin-top: -5px;
  font-size: 14px;
  color: #999999;
  line-height: 17px;
  display: block;
  float: left;
  width: 100%;
  margin-right: -75px;
  position: relative;
  left: 10px;

}

.recom_hover .text_name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-right: 90px;
  font-style: normal;
  text-align: left;
}

.recom_hover .viewer_num {
  margin-top: -5px;
  font-size: 14px;
  color: #999;
  float: right;
  margin-right: 15px;
  display: block;
  font-style: normal;
}

.image_shadow {
  position: absolute;
  right: 10px;
  height: 192px;

  background: url(/opa.png) center bottom no-repeat;
}

</style>
