'use strict'

import { app, protocol, BrowserWindow, ipcMain, screen, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
// import LocalStorage from 'lowdb/adapters/LocalStorage'
import axios from 'axios'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import WebSocket from 'ws'
import cron from 'node-cron'
import os from 'os'

const isDevelopment = process.env.NODE_ENV !== 'production'

const homeDir = os.homedir()

const adapter = new FileSync(homeDir + '\\AppData\\Roaming\\bigo\\db.json')
// const adapter = new LocalStorage('db')
const db = lowdb(adapter)
db.defaults({ users: [] }).write()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let videos = []
let chats = []
let appQuiting = false
let giftJSONLikeArr = []

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Bigo Live',
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  mainWindow.maximize()

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    mainWindow.loadURL('app://./index.html')
  }

  mainWindow.on('closed', () => {
    if (process.platform !== 'darwin') {
      appQuiting = true
      app.quit()
    }
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    appQuiting = true
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  axios.get('https://activity.bigo.tv/live/giftconfig/getOnlineGifts?jsoncallback=?')
    .then(res => {
      giftJSONLikeArr = JSON.parse(res.data.slice(2, -1))
    })

  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

ipcMain.on('getCountries', async (event, args) => {
  let countries = []
  const res = await axios.get('https://www.bigo.tv/openInterface/getCountryInfoList')
  if (res.data.code === 1 && res.data.msg === 'success') {
    countries = Object.values(res.data.data).map(({ country_code: code, country_name: label }) => ({ label, code }))
  }

  mainWindow.webContents.send('countries', countries)
})

ipcMain.on('getUsers', async (event, args) => {
  const res = await fetch('https://www.bigo.tv/openOfficialWeb/vedioList/5', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip,deflate,br',
      'accept-language': 'en-US,en;q=0.9,ar-LY;q=0.8,ar;q=0.7',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest'
    },
    referrer: 'https://www.bigo.tv/show',
    referrerPolicy: 'no-referrer-when-downgrade',
    // 'body': 'ignoreUids=1578156944&tabType=ALL',
    body: args,
    method: 'POST',
    mode: 'cors'
  })

  mainWindow.webContents.send('users', await res.json())
})

ipcMain.on('createChatWindow', (event, args) => {
  if (chats.find(c => c.id === args.id)) return

  const cWin = new BrowserWindow({
    show: true,
    useContentSize: true,
    maximizable: false,

    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  chats.push({ id: args.id, cWin })

  const path = `/#/chat?id=${encodeURIComponent(args.id)}&name=${encodeURIComponent(args.name)}`
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    cWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + path)
    if (!process.env.IS_TEST) cWin.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    cWin.loadURL('app://./index.html' + path)
  }
  cWin.setTitle(`Chat: ${args.id} - ${args.name}`)

  cWin.on('closed', () => {
    if (!appQuiting) {
      mainWindow.webContents.send('removeChat', args.id)
      chats = chats.filter(c => c.id !== args.id)
    }
  })
})

ipcMain.on('createVideoWindow', (event, args) => {
  if (videos.find(v => v.id === args.id)) return

  // const { height: maxHeight, width: maxWidth } = screen.getPrimaryDisplay().workAreaSize

  const vWin = new BrowserWindow({
    show: true,
    // parent: mainWindow,
    useContentSize: true,
    maximizable: false,
    // frame: false,
    // maxHeight,
    // maxWidth,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  videos.push({ id: args.id, vWin })
  const path = `/#/video/${args.id}/${args.name}`
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    vWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL + path)
    if (!process.env.IS_TEST) vWin.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    vWin.loadURL('app://./index.html' + path)
  }
  vWin.setTitle(`${args.id} - ${args.name}`)
  // vWin.setMenu(null)

  vWin.on('closed', () => {
    if (!appQuiting) {
      mainWindow.webContents.send('removeVideo', args.id)
      videos = videos.filter(v => v.id !== args.id)
    }
  })

  const video = videos.find(v => v.id === args.id)
  if (!video || video.aspect) return

  const MIN_HEIGHT = 0
  const MIN_WIDTH = 0

  const LEFT = 1
  const RIGHT = 2
  const TOP = 3
  const LEFTTOP = 4
  const RIGHTTOP = 5
  const BOTTOM = 6
  const BOTTOMLEFT = 7
  const BOTTOMRIGHT = 8

  const extraWidth = 0
  const extraHeight = 0

  function getHeight (aspectRatio, width) {
    return Math.max(
      MIN_HEIGHT,
      Math.floor((width - extraWidth) / aspectRatio + extraHeight)
    )
  }

  function getWidth (aspectRatio, height) {
    return Math.max(
      MIN_WIDTH,
      Math.ceil((height - extraHeight) * aspectRatio + extraWidth)
    )
  }

  if (process.platform === 'win32') {
    let resizeDirection

    vWin.hookWindowMessage(0x0214, (wParam) => {
      resizeDirection = wParam.readUIntBE(0, 1)
    })

    vWin.on('will-resize', (event, newBounds) => {
      const b = vWin.getBounds()
      const cb = vWin.getContentBounds()
      newBounds = {
        x: cb.x + (newBounds.x - b.x),
        y: cb.y + (newBounds.y - b.y),
        width: cb.width + (newBounds.width - b.width),
        height: cb.height + (newBounds.height - b.height)
      }

      if (video.aspect && vWin) {
        event.preventDefault()
        let tempWidth
        let tempHeight
        const toBounds = { ...newBounds }
        switch (resizeDirection) {
          case LEFT:
          case RIGHT:
            toBounds.height = getHeight(
              video.aspect,
              newBounds.width
            )
            break
          case TOP:
          case BOTTOM:
            toBounds.width = getWidth(video.aspect, newBounds.height)
            break
          case BOTTOMLEFT:
          case BOTTOMRIGHT:
          case LEFTTOP:
          case RIGHTTOP:
            toBounds.width = getWidth(video.aspect, newBounds.height)
            tempWidth = newBounds.width
            tempHeight = getHeight(video.aspect, tempWidth)
            if (
              tempWidth * tempHeight >
              toBounds.width * toBounds.height
            ) {
              toBounds.width = tempWidth
              toBounds.height = tempHeight
            }
            break
          default:
        }
        switch (resizeDirection) {
          case BOTTOMLEFT:
            toBounds.x = newBounds.x + newBounds.width - toBounds.width
            break
          case LEFTTOP:
            toBounds.x = newBounds.x + newBounds.width - toBounds.width
            toBounds.y = newBounds.y + newBounds.height - toBounds.height
            break
          case RIGHTTOP:
            toBounds.y = newBounds.y + newBounds.height - toBounds.height
            break
          default:
        }
        // vWin.setSize(toBounds.width, toBounds.height)
        // vWin.setBounds(toBounds)
        // vWin.setContentBounds({ width: toBounds.width, height: toBounds.height })
        // vWin.setTitle(`{x: ${b.x}, y: ${b.y}, w: ${b.width}, h: ${b.height}}`)
        // vWin.setContentSize(toBounds.width, toBounds.height)
        vWin.setContentBounds(toBounds)
        // vWin.setPosition(toBounds.x, toBounds.y)
      }
    })
  }
})

ipcMain.on('getVideoUrl', async (event, args) => {
  event.sender.send('videoUrl', await getUserUrls(args))
})

ipcMain.on('setWindowSize', (event, args) => {
  const video = videos.find(v => v.id === args.id)
  if (!video) {
    console.log('ERROR in setWindowSize')
    return
  }

  const aspect = args.w / args.h
  let w, h
  const { width, height } = screen.getPrimaryDisplay().workArea
  if (args.w > args.h) {
    w = Math.min(width - 60, args.w)
    h = w / aspect
  } else {
    h = Math.min(height - 60, args.h)
    w = h * aspect
  }
  if (!video.aspect) {
    video.vWin.setContentSize(parseInt(w), parseInt(h))
  }
  video.aspect = w / h
})

ipcMain.on('closeVideo', (event, args) => {
  const video = videos.find(v => v.id === args)
  if (video) {
    video.vWin.close()
  }
})

ipcMain.on('showFavDialog', (event, args) => {
  const parent = BrowserWindow.fromWebContents(event.sender)
  const dialogWidth = 500
  const dialogHeight = 250
  const dialog = new BrowserWindow({
    title: 'Add to favourites dialog',
    width: dialogWidth,
    height: dialogHeight,
    parent: parent,
    modal: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  const parentBounds = parent.getContentBounds()
  const childBounds = {
    x: parseInt((parentBounds.width / 2) - (dialogWidth / 2) + parentBounds.x),
    y: parseInt((parentBounds.height / 2) - (dialogHeight / 2) + parentBounds.y),
    width: dialogWidth,
    height: dialogHeight
  }

  dialog.setContentBounds(childBounds)

  const inputMenu = Menu.buildFromTemplate([
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { type: 'separator' },
    { role: 'selectall' }
  ])

  dialog.webContents.on('context-menu', (e, props) => {
    const { isEditable } = props
    if (isEditable) {
      inputMenu.popup(dialog)
    }
  })

  let path = '/#/fav-dialog'
  if (args) {
    path += '?'

    if (args.id) path += `id=${encodeURIComponent(args.id)}&`
    if (args.name) path += `name=${encodeURIComponent(args.name)}&`
    if (args.edit) path += `edit=${encodeURIComponent(args.edit)}&`

    path = path.slice(0, -1)
  }

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    dialog.loadURL(process.env.WEBPACK_DEV_SERVER_URL + path)
    if (!process.env.IS_TEST) dialog.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    dialog.loadURL('app://./index.html' + path)
  }

  dialog.show()
})

const getUserUrls = async (userId) => {
  const r = await axios.get('https://www.bigo.tv/OInterface/getVideoParam?bigoId=' + userId)
  if (r.data.msg === 'success' && r.data.data.wsUrl !== '') {
    const wsUrl = r.data.data.wsUrl
    const parts = wsUrl.replace('ws', 'http').replace('wsconnect', 'list').replace('?', '&').split('&')
    const videoUrl = parts[0] + '_' + parts[2] + '_' + parts[1] + '_' + parts[4] + '.m3u8'
    return { wsUrl, videoUrl }
  }
  return { wsUrl: '', videoUrl: '' }
}

const getUserViewers = (wsUrl) => {
  return new Promise(resolve => {
    const ws = new WebSocket(wsUrl)
    ws.on('message', (data) => {
      try {
        const j = JSON.parse(data)
        if (j[0] && j[0].c === 5) {
          resolve(j[0].data.m)
        }
      } catch (error) {
      }
    })
  })
}

const pushFavs = () => {
  mainWindow.webContents.send('favs', { favs: db.get('users').toJSON() })
}

const updateUser = async (user, createIfNotExists) => {
  const u = db.get('users').find({ id: user.id })
  if (u.value()) {
    if (new Date() - new Date(u.value().lastUpdate) < 500) {
      return u.value()
    }
  }

  const urls = await getUserUrls(user.id)
  if (!createIfNotExists && !u.value()) {
    user.wsUrl = urls.wsUrl
    user.videoUrl = urls.videoUrl
  } else {
    if (urls.wsUrl !== '') {
      // user is live
      const res = await axios.get('http://www.bigo.tv/' + user.id)
      const $ = cheerio.load(res.data)
      user.name = $('h3.hosts_name').text()
      if (!user.customName) user.customName = user.name
      user.beans = $('#beans_e').text()
      user.viewers = await getUserViewers(urls.wsUrl)
      user.country = $('#country_e').text()
      user.thumb_img = $('img.thumb_img').first().attr('src')

      user.live = true
      user.wsUrl = urls.wsUrl
      user.videoUrl = urls.videoUrl
    } else {
      // user is not live
      user.live = false
      user.wsUrl = ''
      user.videoUrl = ''
      user.viewers = '0'
    }

    user.lastUpdate = new Date()

    if (u.value()) u.assign(user).write()
    else db.get('users').push(user).write()

    pushFavs()
  }

  return user
}

ipcMain.on('addFav', (event, args) => {
  const { id, name, edit } = args
  if (!id) return
  if (edit) {
    db.get('users')
      .find({ id: edit })
      .assign({ id, customName: name })
      .write()
    if (!name) {
      updateUser({ id })
    } else {
      pushFavs()
    }
  } else {
    updateUser({ id, customName: name }, true)
  }
})

ipcMain.on('getFavs', () => {
  pushFavs()
})

ipcMain.on('deleteFav', (event, args) => {
  db.get('users')
    .remove(args)
    .write()

  pushFavs()
})

ipcMain.on('getGiftJSONLikeArr', async (event) => {
  event.sender.send('giftJSONLikeArr', giftJSONLikeArr)
})

cron.schedule('0,5,10,15,20,25,30,35,40,45,50,55 * * * *', async function () {
  const start = new Date()

  const users = db.get('users').value()
  for (const user of users) {
    await updateUser(user, false)
  }

  const end = new Date() - start
  console.log(`Updating users took ${end}ms`)
})
