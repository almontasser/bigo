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
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
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
  }
]

const router = new VueRouter({
  routes
})

export default router
