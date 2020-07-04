import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    videos: [],
    chats: []
  },
  mutations: {
    addVideo (state, payload) {
      if (payload.id && !state.videos.find(v => v.id === payload.id)) {
        state.videos.push(payload)
      }
    },
    addChat (state, payload) {
      state.chats.push(payload)
    },
    removeVideo (state, payload) {
      state.videos = state.videos.filter(v => v.id !== payload.id)
    },
    removeChat (state, payload) {
      state.chats = state.chats.filter(c => c.id !== payload.id)
    }
  },
  actions: {
  },
  modules: {
  },
  plugins: [
    createPersistedState()
  ]
})
