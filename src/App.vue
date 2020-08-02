<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<style>
html, body {
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  overflow: hidden;
  height: 100%;
}

.v-context li {
  cursor: pointer;
}

.v-context li.disabled {
  pointer-events: none;
  cursor: default;
}

.v-context li.disabled > a {
  color: silver;
}

</style>
