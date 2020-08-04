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

.v-context, .v-context ul {
  margin: 0;
  padding: 0;
  background-color: #ecf0f1;
  border-bottom-width: 0px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  box-shadow: 0 3px 6px 0 rgba(51, 51, 51, 0.2);
  border-radius: 4px;
  border: none;
}

.v-context>li>a, .v-context ul>li>a {
  padding: 5px 15px;
  cursor: pointer;
}

.v-context li:first-of-type a {
  /* margin-top: 4px; */
}

.v-context li:last-of-type a {
  /* margin-bottom: 4px; */
}

.v-context li a:hover, .v-context ul li a:hover {
  background-color: #007aff;
  color: #fff;
}

.v-context li.disabled {
  pointer-events: none;
  cursor: default;
}

.v-context li.disabled > a {
  color: silver;
}

@import '~vue-context/dist/css/vue-context.css'

</style>
