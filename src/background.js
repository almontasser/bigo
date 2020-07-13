'use strict'

import { app, protocol, BrowserWindow, ipcMain, Menu } from 'electron'
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

import './store'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let rooms = []
let appQuiting = false
let giftJSONLikeArr = []

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

const homeDir = os.homedir()

const adapter = new FileSync(homeDir + '\\AppData\\Roaming\\bigo\\db.json')
// const adapter = new LocalStorage('db')
const db = lowdb(adapter)
db.defaults({ users: [], videoRefreshTimeout: 5000 }).write()

function loadURL (window, path, showDevTools) {
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    window.loadURL(process.env.WEBPACK_DEV_SERVER_URL + path)
    if (!process.env.IS_TEST && showDevTools) window.webContents.openDevTools()
  } else {
    createProtocol('app')
    window.loadURL('app://./index.html' + path)
  }
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    title: 'Bigo Live',
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  mainWindow.maximize()

  const controlsWidth = 71
  const controlsHeight = 29
  const controls = new BrowserWindow({
    parent: mainWindow,
    hasShadow: false,
    resizable: false,
    width: controlsWidth,
    height: controlsHeight,
    useContentSize: true,
    frame: false,
    transparent: true,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  loadURL(controls, '/#/main-controls', false)
  controls.show()

  const moveControlsWindow = () => {
    if (mainWindow && controls) {
      const position = mainWindow.getPosition()
      const winSize = mainWindow.getSize()
      controls.setPosition(position[0] + winSize[0] - controlsWidth - 145, position[1] + 1)
    }
  }

  moveControlsWindow()

  mainWindow.on('move', moveControlsWindow)
  mainWindow.on('resize', moveControlsWindow)

  mainWindow.setMenu(null)

  // if (!process.env.WEBPACK_DEV_SERVER_URL) createProtocol('app')
  loadURL(mainWindow, '', true)

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
  createWindow()

  axios.get('https://activity.bigo.tv/live/giftconfig/getOnlineGifts?jsoncallback=?')
    .then(res => {
      giftJSONLikeArr = JSON.parse(res.data.slice(2, -1))
    })
    .catch(() => {})
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

  event.sender.send('countries', countries)
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

const switchGradeToColor = (lev) => {
  const arrColor = ['#78dbc7', '#6bc9e3', '#799bec', '#a28ded', '#da8dee', '#f393d9', '#fd9ebd', '#fd809e', '#f26283']
  var index = 0
  if (lev <= 33) {
    if (lev <= 11) {
      index = 1
    } else if (lev <= 22) {
      index = 2
    } else {
      index = 3
    }
  } else if (lev <= 55) {
    if (lev <= 44) {
      index = 4
    } else {
      index = 5
    }
  } else if (lev <= 77) {
    if (lev <= 66) {
      index = 6
    } else {
      index = 7
    }
  } else {
    if (lev <= 88) {
      index = 8
    } else {
      index = 9
    }
  }
  return arrColor[index]
}

const switchGiftCodeToURL = (giftCode) => {
  var allGiftArr = giftJSONLikeArr
  var targetGift = {}
  targetGift.name = 'gift'
  targetGift.url = '/images/favicon.ico'
  for (var i = 0, len = allGiftArr.length; i < len; i++) {
    if (+allGiftArr[i].typeid === +giftCode) {
      targetGift.url = allGiftArr[i].img_url
      targetGift.name = allGiftArr[i].name
      return targetGift
    }
  }
  return targetGift
}

const joinUrlAndNameToGiftIcon = (iconNumber) => {
  return '<img src="' + switchGiftCodeToURL(iconNumber).url + '" />'
}

const chatContentType = {
  type1: '<li><p class="room_notice public_notice">===</p></li>',
  type2: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">===</span></li>',
  type3: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">shared this LIVE</span></li>',
  type4: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">sent<img src="/images/gift/like.png"></span></li>',
  type5: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">became a Fan.Won\'t miss the next LIVE</span></li>',
  type6: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">sent a&nbsp;===&nbsp;===&nbsp;X===</span></li>'
}

const createRoom = async (id) => {
  const room = await getUserUrls(id)
  room.id = id
  if (room.wsUrl) {
    room.ws = new WebSocket(room.wsUrl)
    room.ws.on('message', (data) => {
      try {
        const arr = JSON.parse(data)

        const arrLength = arr.length
        let allWords = ''
        for (let i = arrLength - 1; i >= 0; i--) {
          const obj = arr[i]
          switch (obj.c) {
            case 0:
              // Room End
              if (room.cWin) room.cWin.webContents.send('roomEnded')
              if (room.vWin) room.vWin.webContents.send('roomEnded')
              break
            case 1:
              allWords += chatContentType.type2
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.n)
                .replace('===', obj.data.m.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              break
            case 2:
              allWords += chatContentType.type1
                .replace('===', 'Broadcaster will leave for a moment. Please hold on')
              if (room.vWin) room.vWin.webContents.send('hold')
              break
            case 3:
              allWords += chatContentType.type1
                .replace('===', 'Broadcaster is back. LIVE is recovering')
              if (room.vWin) room.vWin.webContents.send('resume')
              break
            case 4:
              allWords += chatContentType.type3
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.m)
              break
            case 5:
              // this.updataLiveCount(obj.data.m);
              break
            case 6:
              // console.log(obj)
              break
            case 7:
              // console.log(obj)
              break
            case 8:
              allWords += chatContentType.type6
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.n)
                .replace('===', switchGiftCodeToURL(obj.data.m).name)
                .replace('===', joinUrlAndNameToGiftIcon(obj.data.m))
                .replace('===', obj.data.c)
              break
            case 9:
              allWords += chatContentType.type4
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.n)
              break
            case 10:
              allWords += chatContentType.type5
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.m)
              break
            case 11:
              allWords += chatContentType.type1
                .replace('===', obj.data.m)
              break
            case 12:
              allWords += chatContentType.type2
                .replace('===', switchGradeToColor(obj.grade))
                .replace('===', obj.grade)
                .replace('===', obj.data.n)
                .replace('===', obj.data.m.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              break
            case 13:
              // giftAnimationObject.giftAnimationStart(obj)
              // this.updataBeans(obj.ticket)
              break
            case 14:
              // console.log(obj)
              break
          }
        }
        if (allWords && room.cWin) {
          room.cWin.webContents.send('message', allWords)
        }
      } catch (error) {
      }
    })
  }
  return room
}

ipcMain.on('createChatWindow', async (event, args) => {
  let room = rooms.find(r => r.id === args.id)
  if (room && room.cWin) {
    room.cWin.show()
    return
  }

  const cWin = new BrowserWindow({
    show: true,
    useContentSize: true,
    maximizable: false,
    alwaysOnTop: true,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  cWin.setMenu(null)
  // cWin.menuBarVisible = false

  if (!room) {
    room = await createRoom(args.id)
  }

  room.cWin = cWin

  rooms.push(room)

  const path = `/#/chat?id=${encodeURIComponent(args.id)}&name=${encodeURIComponent(args.name)}`
  loadURL(cWin, path, true)

  cWin.setTitle(`Chat: ${args.id} - ${args.name}`)

  cWin.on('closed', () => {
    if (!appQuiting) {
      mainWindow.webContents.send('removeChat', args.id)
      delete room.cWin
      if (!room.vWin) {
        if (room.ws) room.ws.close()
        rooms = rooms.filter(r => r.id !== args.id)
      }
    }
  })
})

ipcMain.on('createVideoWindow', async (event, args) => {
  let room = rooms.find(v => v.id === args.id)
  if (room && room.vWin) {
    room.vWin.show()
    return
  }

  const vWin = new BrowserWindow({
    show: true,
    maximizable: false,
    alwaysOnTop: true,
    width: 480,
    height: 640,
    useContentSize: true,
    // autoHideMenuBar: true,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  const controlsWidth = 107
  const controlsHeight = 29
  const controls = new BrowserWindow({
    parent: vWin,
    hasShadow: false,
    resizable: false,
    width: controlsWidth,
    height: controlsHeight,
    frame: false,
    transparent: true,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })
  loadURL(controls, '/#/video-controls?id=' + encodeURIComponent(args.id), false)
  controls.show()

  const moveControlsWindow = () => {
    if (vWin && controls) {
      const position = vWin.getPosition()
      const vWinSize = vWin.getSize()
      controls.setPosition(position[0] + vWinSize[0] - controlsWidth - 145, position[1] + 1)
    }
  }

  moveControlsWindow()

  vWin.on('move', moveControlsWindow)
  vWin.on('resize', moveControlsWindow)

  vWin.setMenu(null)

  if (!room) {
    room = await createRoom(args.id)
    room.aspect = 480 / 640
  }

  room.vWin = vWin
  room.vWinControls = controls

  rooms.push(room)

  const path = `/#/video?id=${encodeURIComponent(args.id)}&name=${encodeURIComponent(args.name)}`
  loadURL(vWin, path, true)

  vWin.setTitle(`${args.id} - ${args.name}`)

  vWin.on('closed', () => {
    if (!appQuiting) {
      mainWindow.webContents.send('removeVideo', args.id)
      delete room.vWin
      if (!room.cWin) {
        if (room.ws) room.ws.close()
        rooms = rooms.filter(r => r.id !== args.id)
      }
    }
  })

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
      if (room.aspect) {
        event.preventDefault()
        const b = vWin.getBounds()
        const cb = vWin.getContentBounds()
        newBounds = {
          x: cb.x + (newBounds.x - b.x),
          y: cb.y + (newBounds.y - b.y),
          width: cb.width + (newBounds.width - b.width),
          height: cb.height + (newBounds.height - b.height)
        }

        let tempWidth
        let tempHeight
        const toBounds = { ...newBounds }
        switch (resizeDirection) {
          case LEFT:
          case RIGHT:
            toBounds.height = getHeight(
              room.aspect,
              newBounds.width
            )
            break
          case TOP:
          case BOTTOM:
            toBounds.width = getWidth(room.aspect, newBounds.height)
            break
          case BOTTOMLEFT:
          case BOTTOMRIGHT:
          case LEFTTOP:
          case RIGHTTOP:
            toBounds.width = getWidth(room.aspect, newBounds.height)
            tempWidth = newBounds.width
            tempHeight = getHeight(room.aspect, tempWidth)
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
        vWin.setContentBounds(toBounds)
      }
    })
  }
})

ipcMain.on('getVideoUrl', async (event, args) => {
  event.sender.send('videoUrl', await getUserUrls(args))
})

ipcMain.on('closeVideo', (event, args) => {
  const room = rooms.find(v => v.id === args)
  if (room) {
    room.vWin.close()
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
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      enableRemoteModule: true,
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

  loadURL(dialog, path, false)

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

    mainWindow.webContents.send('fav', user)
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

ipcMain.on('refreshFavs', () => {
  updateUsers()
})

ipcMain.on('deleteFav', (event, args) => {
  db.get('users')
    .remove(args)
    .write()

  pushFavs()
})

ipcMain.on('showVideoWindow', (event, args) => {
  const room = rooms.find(r => r.id === args.id)
  if (room && room.vWin) room.vWin.show()
})

ipcMain.on('showChatWindow', (event, args) => {
  const room = rooms.find(r => r.id === args.id)
  if (room && room.cWin) room.cWin.show()
})

ipcMain.on('getVideoRefreshTimeout', (event) => {
  event.sender.send('videoRefreshTimeout', { videoRefreshTimeout: db.get('videoRefreshTimeout').value() })
})

ipcMain.on('setVideoRefreshTimeout', (event, args) => {
  db.set('videoRefreshTimeout', args.videoRefreshTimeout).write()
  mainWindow.webContents.send('videoRefreshTimeout', { videoRefreshTimeout: args.videoRefreshTimeout })
  rooms.forEach(room => {
    if (room.vWin) {
      room.vWin.webContents.send('videoRefreshTimeout', { videoRefreshTimeout: args.videoRefreshTimeout })
    }
  })
})

ipcMain.on('showSettings', (event) => {
  const parent = mainWindow
  const dialogWidth = 500
  const dialogHeight = 175
  const dialog = new BrowserWindow({
    title: 'Settings',
    width: dialogWidth,
    height: dialogHeight,
    parent: parent,
    modal: true,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      enableRemoteModule: true,
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

  const path = '/#/settings'

  loadURL(dialog, path, false)

  dialog.show()
})

ipcMain.on('toggleControls', (event, args) => {
  const room = rooms.find(r => r.id === args.id)
  if (room && room.vWin) {
    room.vWin.webContents.send('toggleControls')
  }
})

ipcMain.on('reloadVideo', (event, args) => {
  const room = rooms.find(r => r.id === args.id)
  if (room && room.vWin) {
    // room.vWin.webContents.send('reloadVideo')
    room.vWin.reload()
  }
})

ipcMain.on('resizeVideo', (event, args) => {
  const room = rooms.find(r => r.id === args.id)
  if (room && room.vWin) {
    room.vWin.webContents.send('resizeVideo')
  }
})

ipcMain.on('reloadAll', () => {
  mainWindow.reload()
  rooms.forEach(room => {
    if (room.vWin) room.vWin.reload()
  })
})

const updateUsers = async () => {
  const users = db.get('users').value()
  const updates = []
  for (const user of users) {
    updates.push(updateUser(user, false))
  }
  return Promise.all(updates)
}

cron.schedule('0,5,10,15,20,25,30,35,40,45,50,55 * * * *', async function () {
  const start = new Date()

  await updateUsers()

  const end = new Date() - start
  console.log(`Updating users took ${end}ms`)
})

updateUsers()
