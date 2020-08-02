import Vue from 'vue'
import Vuex from 'vuex'
// import { ipcRenderer } from 'electron'
import { createSharedMutations } from 'vuex-electron'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    videos: [],
    chats: []
  },
  mutations: {
    mAddVideo (state, payload) {
      return new Promise((resolve) => {
        if (payload.id) {
          if (!state.videos.find(v => v.id === payload.id)) {
            state.videos.push(payload)
            resolve(true)
          } else {
            resolve(false)
          }
        }
      })
    },
    mAddChat (state, payload) {
      return new Promise((resolve) => {
        if (payload.id) {
          if (!state.chats.find(c => c.id === payload.id)) {
            state.chats.push(payload)
            resolve(true)
          } else {
            resolve(false)
          }
        }
      })
    },
    mRemoveVideo (state, payload) {
      state.videos = state.videos.filter(v => v.id !== payload.id)
    },
    mRemoveChat (state, payload) {
      state.chats = state.chats.filter(c => c.id !== payload.id)
    }
  },
  actions: {
    addVideo ({ commit }, payload) {
      commit('mAddVideo', payload)
    },
    addChat ({ commit }, payload) {
      commit('mAddChat', payload)
    },
    removeVideo ({ commit }, payload) {
      commit('mRemoveVideo', payload)
    },
    removeChat ({ commit }, payload) {
      commit('mRemoveChat', payload)
    }
  },
  modules: {
  },
  plugins: [
    createSharedMutations()
    // createPersistedState({ throttle: 500 })
  ]
})
