import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/video',
    name: 'Video',
    component: () => import(/* webpackChunkName: "about" */ '../views/Video.vue')
  },
  {
    path: '/fav-dialog',
    name: 'FavDialog',
    component: () => import(/* webpackChunkName: "about" */ '../views/FavDialog.vue')
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import(/* webpackChunkName: "about" */ '../views/Chat.vue')
  },
  {
    path: '/video-controls',
    name: 'VideoControls',
    component: () => import(/* webpackChunkName: "about" */ '../views/VideoControls.vue')
  },
  {
    path: '/main-controls',
    name: 'MainControls',
    component: () => import(/* webpackChunkName: "about" */ '../views/MainControls.vue')
  },
  {
    path: '/chat-controls',
    name: 'ChatControls',
    component: () => import(/* webpackChunkName: "about" */ '../views/ChatControls.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "about" */ '../views/SettingsDialog.vue')
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import(/* webpackChunkName: "about" */ '../views/Accounts.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
