module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        productName: 'Bigo Live',
        win: {
          icon: './icon.ico'
        }
      }
    }
  }
}
