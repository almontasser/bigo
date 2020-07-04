<template>
  <b-form @submit="onSubmit" @keydown="onKeypress" style="padding: 20px">
    <b-form-group
        id="id-group"
        label="User ID:"
        label-for="idInput"
      >
        <b-form-input
          id="idInput"
          v-model="id"
          type="text"
          required
          placeholder="Enter user ID"
        ></b-form-input>
      </b-form-group>
      <b-form-group
        id="name-group"
        label="User name:"
        label-for="nameInput"
      >
        <b-form-input
          id="nameInput"
          v-model="name"
          type="text"
          placeholder="Enter user name"
        ></b-form-input>
      </b-form-group>
      <b-button type="submit" variant="primary" class="mr-2">Add to favouries</b-button>
      <b-button type="reset" variant="danger" @click="close">Cancel</b-button>
  </b-form>
</template>

<script>
import { remote, ipcRenderer } from 'electron'

export default {
  data () {
    return {
      id: '',
      name: '',
      edit: null
    }
  },
  methods: {
    close () {
      remote.getCurrentWindow().close()
    },
    onSubmit () {
      ipcRenderer.send('addFav', { id: this.id, name: this.name, edit: this.edit })
      this.close()
    },
    onKeypress (event) {
      if (event.keyCode === 27) {
        this.close()
      }
    }
  },
  mounted () {
    this.id = this.$route.query.id || ''
    this.name = this.$route.query.name || ''
    this.edit = this.$route.query.edit
  }
}
</script>

<style>

</style>
