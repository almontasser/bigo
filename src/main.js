import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import VueSimpleContextMenu from 'vue-simple-context-menu'
import InfiniteLoading from 'vue-infinite-loading'
import vSelect from 'vue-select'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'vue-simple-context-menu/dist/vue-simple-context-menu.css'
import 'vue-select/dist/vue-select.css'

Vue.config.productionTip = false

// Install BootstrapVue
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)
Vue.component('vue-simple-context-menu', VueSimpleContextMenu)
Vue.use(InfiniteLoading, { /* options */ })
Vue.component('v-select', vSelect)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
