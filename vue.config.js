module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      experimentalNativeDepCheck: true,
      builderOptions: {
        productName: 'Bigo Live',
        win: {
          icon: './icon.ico'
        }
      }
    }
  }
}
