'use strict'

import { app, protocol, BrowserWindow, ipcMain, Menu, session } from 'electron'
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
import AwaitLock from 'await-lock'

import './store'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let rooms = []
let appQuiting = false
let giftJSONLikeArr = []

const updateRoomLock = new AwaitLock()
const getRoomLock = new AwaitLock()
const refreshRoomLock = new AwaitLock()

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
  return '<img style="height:40px;" src="' + switchGiftCodeToURL(iconNumber).url + '" />'
}

const chatContentType = {
  type1: '<li><p class="room_notice public_notice">===</p></li>',
  type2: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">===</span></li>',
  type3: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">shared this LIVE</span></li>',
  type4: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="user_text_content">sent<img src="/images/gift/like.png"></span></li>',
  type5: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">became a Fan. Won\'t miss the next LIVE</span></li>',
  type6: '<li><span class="user_grade"><p class="grade_num" style="background:===;">===</p></span><span class="user_name">===</span><i class="name_dot_chat">：</i><span class="room_notice">sent a&nbsp;===&nbsp;===&nbsp;X===</span></li>'
}

const getRoom = async (id, create) => {
  await getRoomLock.acquireAsync()
  try {
    let room = rooms.find(r => r.id === id)
    if (room) return room
    if (create) {
      const user = await getUserDetails({ id })
      room = {
        id,
        wsUrl: user.wsUrl,
        videoUrl: user.videoUrl,
        bc_gid: user.bc_gid,
        owner: user.owner,
        name: user.name,
        account: null,
        updateWs: async () => {
          await refreshRoomLock.acquireAsync()
          try {
            console.log('inside updateWs')
            let room = await getRoom(id)
            if (!room) return
            if (!room.roomEnded && (!room.ws || room.ws.readyState === WebSocket.CLOSED)) {
              console.log('Create WebSocket')
              const urls = await getUserUrls(id)
              room = await updateRoom({ id: room.id, wsUrl: urls.wsUrl, videoUrl: urls.videoUrl })
              if (room.wsUrl) {
                if (room.cWin) {
                  room.cWin.webContents.send('roomStatus', { online: true })
                }
                const ws = new WebSocket(room.wsUrl)
                ws.on('open', () => {
                  room.ws.send('websocket')
                })
                ws.on('message', async (data) => {
                  try {
                    const arr = JSON.parse(data)
                    if (data.includes('PK')) console.log(arr)
                    if (data.includes('Mahmoud')) console.log(arr)
                    const arrLength = arr.length
                    let allWords = ''
                    for (let i = arrLength - 1; i >= 0; i--) {
                      const obj = arr[i]
                      switch (obj.c) {
                        case 0:
                          // Room End
                          if (room.cWin) room.cWin.webContents.send('roomEnded')
                          if (room.vWin) room.vWin.webContents.send('roomEnded', { id: room.id })
                          room.roomEnded = true
                          if (room.wsTimeout) {
                            clearTimeout(room.wsTimeout)
                            room = await updateRoom({ id: room.id, wsTimeout: null })
                          }
                          room.ws.close()
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
                          if (room.vWin) room.vWin.webContents.send('hold', { id: room.id })
                          break
                        case 3:
                          allWords += chatContentType.type1
                            .replace('===', 'Broadcaster is back. LIVE is recovering')
                          if (room.vWin) room.vWin.webContents.send('resume', { id: room.id })
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

                // room.ws.on('error', (error) => {
                //   room.cWin.webContents.send('message', 'error: ' + error)
                // })

                ws.on('close', (code, reason) => {
                  console.log('Websocket Closed')
                  room.wsTimeout = setTimeout(async () => {
                    room.wsTimeout = null
                    await room.updateWs()
                  }, 1000)
                })
                room = await updateRoom({ id: room.id, ws })
              } else {
                if (room.cWin) {
                  room.cWin.webContents.send('roomStatus', { online: false })
                }
                return
              }
            }
          } finally {
            refreshRoomLock.release()
          }
        }
      }

      rooms.push(room)
      return room
    }
    return null
  } finally {
    getRoomLock.release()
  }
}

const updateRoom = async (room) => {
  await updateRoomLock.acquireAsync()
  try {
    const oldRoom = await getRoom(room.id, true)
    Object.assign(oldRoom, room)
    return oldRoom
  } finally {
    updateRoomLock.release()
  }
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

const homeDir = os.homedir()

const adapter = new FileSync(homeDir + '\\AppData\\Roaming\\bigo\\db.json')
// const adapter = new LocalStorage('db')
const db = lowdb(adapter)
db.defaults({ users: [], videoRefreshTimeout: 5000, accounts: [] }).write()

async function loadURL (window, path, showDevTools) {
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await window.loadURL(process.env.WEBPACK_DEV_SERVER_URL + path)
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

  const controlsWidth = 140
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
  app.userAgentFallback = app.userAgentFallback
    .replace(/ Electron\\?.([^\s]+)/g, '')
    .replace(/Chrome\\?.([^\s]+)/g, '')
    // .replace(/Chrome\\?.([^\s]+)/g, 'Chrome/83.0.4103.116')
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
  let ignore = '1578156944'
  while (true) {
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
      body: `ignoreUids=${ignore}&tabType=${args.tabType}`,
      method: 'POST',
      mode: 'cors'
    })

    const json = await res.json()
    if (!json || !json.length) break

    mainWindow.webContents.send('users', { uuid: args.uuid, users: json })

    ignore = json.reduce((a, b) => a + '.' + b.owner, ignore)
  }

  // mainWindow.webContents.send('users', users)
})

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

  const controlsWidth = 71
  const controlsHeight = 29
  const controls = new BrowserWindow({
    parent: cWin,
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
  loadURL(controls, '/#/chat-controls?id=' + encodeURIComponent(args.id), false)
  controls.show()

  const moveControlsWindow = () => {
    if (cWin && controls) {
      const position = cWin.getPosition()
      const winSize = cWin.getSize()
      controls.setPosition(position[0] + winSize[0] - controlsWidth - 145, position[1] + 1)
    }
  }

  moveControlsWindow()

  cWin.on('move', moveControlsWindow)
  cWin.on('resize', moveControlsWindow)

  if (!room) room = await getRoom(args.id, true)
  room = await updateRoom({ id: room.id, cWin: cWin })
  await room.updateWs()

  const path = `/#/chat?id=${encodeURIComponent(args.id)}&name=${encodeURIComponent(args.name)}`
  loadURL(cWin, path, true)

  cWin.setTitle(`Chat: ${args.id} - ${args.name}`)

  cWin.on('closed', async () => {
    leaveGroup(room)
    if (!appQuiting) {
      mainWindow.webContents.send('removeChat', args.id)
      delete room.cWin
      if (!room.vWin) {
        if (room.ws) {
          if (room.wsTimeout) clearTimeout(room.wsTimeout)
          room = await updateRoom({ id: room.id, wsTimeout: null, roomEnded: true })
          room.ws.close()
        }
        rooms = rooms.filter(r => r.id !== args.id)
      }
    }
  })
})

ipcMain.on('createVideoWindow', async (event, args) => {
  let room = await getRoom(args.id)
  // let room = rooms.find(r => r.id === args.id)
  if (room && room.vWin) {
    room.vWin.show()
    return
  }

  room = getRoom(args.id, true)

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

  room = await room
  room = await updateRoom({ id: room.id, aspect: 480 / 640, vWin })
  await room.updateWs()

  const path = `/#/video?id=${encodeURIComponent(args.id)}&name=${encodeURIComponent(args.name)}`
  loadURL(vWin, path, true)

  vWin.setTitle(`${args.id} - ${args.name}`)

  // setTimeout(() => {
  //   if (vWin) {
  //     vWin.webContents.send('hold', { id: args.id })

  //     setTimeout(() => {
  //       if (vWin) {
  //         vWin.webContents.send('resume', { id: args.id })

  //         setTimeout(() => {
  //           if (vWin) {
  //             vWin.webContents.send('roomEnded', { id: args.id })
  //           }
  //         }, 20000)
  //       }
  //     }, 20000)
  //   }
  // }, 20000)

  vWin.on('closed', async () => {
    if (!appQuiting) {
      if (room.vWin === vWin) {
        mainWindow.webContents.send('removeVideo', args.id)
        delete room.vWin
      }
      if (room.id2) {
        let room2 = await getRoom(room.id2)
        if (room2) {
          delete room2.vWin

          if (!room2.cWin) {
            if (room2.ws) {
              if (room2.wsTimeout) clearTimeout(room2.wsTimeout)
              room2 = await updateRoom({ id: room2.id, wsTimeout: null, roomEnded: true })
              room2.ws.close()
              delete room2.ws
            }
            rooms = rooms.filter(r => r.id !== room2.id)
          }
        }
      }
      if (!room.cWin && !room.vWin) {
        if (room.ws) {
          if (room.wsTimeout) clearTimeout(room.wsTimeout)
          room = await updateRoom({ id: room.id, wsTimeout: null, roomEnded: true })
          room.ws.close()
          delete room.ws
        }
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

ipcMain.on('closeVideo', async (event, args) => {
  const room = await getRoom(args.id)
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
          ws.close()
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

const getUserDetails = async (user) => {
  const urls = await getUserUrls(user.id)
  user.live = urls.wsUrl !== ''
  user.wsUrl = urls.wsUrl
  user.videoUrl = urls.videoUrl
  user.viewers = '0'
  user.lastUpdate = new Date()
  if (!user.live) return user

  const res = await axios.get('http://www.bigo.tv/' + user.id)
  const $ = cheerio.load(res.data)
  user.name = $('h3.hosts_name').text()
  const broadcastID = $('#hosts_id_e').attr('host-other').split('&')
  user.bc_gid = broadcastID[0]
  user.owner = broadcastID[1]
  user.beans = $('#beans_e').text()
  user.viewers = await getUserViewers(urls.wsUrl)
  user.country = $('#country_e').text()
  user.thumb_img = $('img.thumb_img').first().attr('src')
  return user
}

const updateUser = async (user) => {
  const u = db.get('users').find({ id: user.id })
  if (u.value()) {
    if (new Date() - new Date(u.value().lastUpdate) < 500) {
      return u.value()
    }
  }

  const customName = user.customName
  user = await getUserDetails(user)
  if (customName) user.customName = customName
  else if (!u.value() || !u.value().customName) user.customName = user.name

  if (u.value()) u.assign(user).write()
  else db.get('users').push(user).write()

  if (mainWindow) mainWindow.webContents.send('fav', user)

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
    const user = { id: args.id, customName: name, live: true, viewers: 0 }
    if (mainWindow) mainWindow.webContents.send('fav', { ...user, updating: true })
    updateUser(user)
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

// ipcMain.on('showVideoWindow', async (event, args) => {
//   const room = await getRoom(args.id)
//   if (room && room.vWin) room.vWin.show()
// })

ipcMain.handle('showVideoWindow', async (event, args) => {
  const room = await getRoom(args.id)
  if (room && room.vWin) {
    room.vWin.show()
    return true
  }
  return false
})

ipcMain.on('showChatWindow', async (event, args) => {
  const room = await getRoom(args.id)
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

ipcMain.on('toggleControls', async (event, args) => {
  const room = await getRoom(args.id)
  if (room && room.vWin) {
    room.vWin.webContents.send('toggleControls')
  }
})

ipcMain.on('reloadVideo', async (event, args) => {
  const room = await getRoom(args.id)
  if (room && room.vWin) {
    // room.vWin.webContents.send('reloadVideo')
    room.vWin.reload()
  }
})

ipcMain.on('resizeVideo', async (event, args) => {
  const room = await getRoom(args.id)
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

ipcMain.on('increaseFontSize', async (event, args) => {
  const room = await getRoom(args.id)
  if (room && room.cWin) {
    room.cWin.webContents.send('increaseFontSize')
  }
})

ipcMain.on('decreaseFontSize', async (event, args) => {
  const room = await getRoom(args.id)
  if (room && room.cWin) {
    room.cWin.webContents.send('decreaseFontSize')
  }
})

ipcMain.on('showAccounts', () => {
  const dialog = new BrowserWindow({
    title: 'Login',
    modal: true,
    show: true,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    width: 400,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  loadURL(dialog, '/#/accounts', true)
})

ipcMain.on('showGoogle', () => {
  const dialog = new BrowserWindow({
    title: 'Google',
    show: true,
    width: 1280,
    height: 720
  })

  dialog.loadURL('https://www.google.com/')

  dialog.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    const win = new BrowserWindow({
      alwaysOnTop: true,
      parent: dialog,
      show: true
    })
    win.loadURL(url)
    event.newGuest = win
  })
})

ipcMain.on('getAccounts', (event) => {
  const accounts = db.get('accounts').toJSON().map(account => ({ ...account, nick_name: decodeURIComponent(account.nick_name) }))
  event.sender.send('accounts', { accounts })
})

ipcMain.on('showLogin', (event) => {
  const dialog = new BrowserWindow({
    title: 'Login',
    parent: BrowserWindow.fromWebContents(event.sender),
    modal: true,
    show: true,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    width: 1280,
    height: 720,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  dialog.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    const win = new BrowserWindow({
      alwaysOnTop: true,
      parent: dialog,
      show: true
    })
    win.loadURL(url)
    event.newGuest = win
  })

  dialog.loadURL('http://www.bigo.tv/', { userAgent: 'Chrome' })

  dialog.on('close', () => {
    session.defaultSession.cookies.get({ url: 'http://bigo.tv' })
      .then((cookies) => {
        const account = {}
        for (const cookie of cookies) {
          account[cookie.name] = cookie.value

          // Delete cookie
          let url = ''
          // get prefix, like https://www.
          url += cookie.secure ? 'https://' : 'http://'
          url += cookie.domain.charAt(0) === '.' ? 'www' : ''
          // append domain and path
          url += cookie.domain
          url += cookie.path

          session.defaultSession.cookies.remove(url, cookie.name, (error) => {
            if (error) console.log(`error removing cookie ${cookie.name}`, error)
          })
        }
        if (!account.yyuid) return
        const existingAccount = db.get('accounts').find({ yyuid: account.yyuid })
        if (existingAccount.value()) {
          existingAccount.assign(account).write()
        } else {
          db.get('accounts').push(account).write()
        }
        event.sender.send('accounts', { accounts: db.get('accounts').toJSON() })
        // session.defaultSession.clearStorageData({ origin: 'http://bigo.tv', storages: ['cookies'] })
      }).catch((error) => {
        console.log(error)
      })
  })
})

const getAccountCookies = (yyuid) => {
  const account = db.get('accounts').find({ yyuid }).value()
  if (!account) return

  return Object.keys(account).map((key) => '' + key + '=' + account[key]).join('; ')
}

ipcMain.on('sendMessage', async (event, args) => {
  const cookie = getAccountCookies(args.account)
  if (!cookie) return

  const room = await getRoom(args.id)
  if (!room) return

  const body = `interfaceName=sendChat&type=1&content=${encodeURIComponent(args.text)}&bc_gid=${room.bc_gid}&owner=${room.owner}`

  fetch('https://weblogin.bigo.tv/broadcast', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ar-LY;q=0.8,ar;q=0.7',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      cookie
    },
    referrer: 'https://weblogin.bigo.tv/communicate',
    referrerPolicy: 'no-referrer-when-downgrade',
    body,
    method: 'POST',
    mode: 'cors'
  })
    .then(res => res.json())
    .then(json => {
      console.log(json)
      event.sender.send('accountStatus', { account: args.account, logedIn: json.resCode === 0 })
    })
})

ipcMain.on('joinGroup', async (event, args) => {
  const room = await getRoom(args.id)
  if (!room) return

  leaveGroup(room)

  const cookie = getAccountCookies(args.account)
  if (!cookie) return

  fetch(`https://weblogin.bigo.tv/joinGroup?bc_gid=${room.bc_gid}&_=${+Date.now()}`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ar-LY;q=0.8,ar;q=0.7',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      cookie
    },
    referrer: 'https://weblogin.bigo.tv/communicate',
    referrerPolicy: 'no-referrer-when-downgrade',
    body: null,
    method: 'GET',
    mode: 'cors'
  })
    .then(res => res.json())
    .then(json => {
      console.log(json)
      event.sender.send('accountStatus', { account: args.account, logedIn: json.resCode === 0 })
      if (json.resCode === 0) {
        updateRoom({ id: room.id, account: args.account })
      }
    })
})

const leaveGroup = (room) => {
  if (room.account) {
    const cookie = getAccountCookies(room.account)
    fetch(`https://weblogin.bigo.tv/leaveGroup?bc_gid=${room.bc_gid}&_=${+Date.now()}`, {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9,ar-LY;q=0.8,ar;q=0.7',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        cookie
      },
      referrer: 'https://weblogin.bigo.tv/communicate',
      referrerPolicy: 'no-referrer-when-downgrade',
      body: null,
      method: 'GET',
      mode: 'cors'
    })
      .then(res => res.json())
      .then(json => console.log(json))
    room.account = null
  }
}

ipcMain.on('getRoomStatus', async (event, args) => {
  const room = await getRoom(args.id)
  if (!room) return

  event.sender.send('roomStatus', { online: room.wsUrl !== '' })
})

async function sendVideoRoomDetails (webContents, id) {
  const room = await getRoom(id)
  let details = {
    id: room.id,
    name: room.name,
    videoUrl: room.videoUrl
  }
  if (room.id2) {
    const room2 = await getRoom(room.id2)
    details = {
      ...details,
      id2: room2.id,
      name2: room2.name,
      videoUrl2: room2.videoUrl
    }
  }
  webContents.send('videoRoomDetails', details)
}

ipcMain.on('attachVideo', async (event, args) => {
  if (args.parentId === args.id) return
  const room = await getRoom(args.parentId)
  if (!room || !room.vWin) return
  if (room.id2) {
    await deattachVideo({ parentId: room.id, id: room.id2 })
  }
  room.id2 = args.id
  const childRoom = await getRoom(args.id, true)
  if (childRoom.vWin) {
    const oldvWin = childRoom.vWin
    childRoom.vWin = room.vWin
    oldvWin.close()
    mainWindow.webContents.send('removeVideo', childRoom.id)
  } else {
    childRoom.vWin = room.vWin
  }
  childRoom.updateWs()
  await sendVideoRoomDetails(room.vWin.webContents, room.id)
  const bounds = room.vWin.getContentBounds()
  room.aspect = 960 / 640
  bounds.width = parseInt(bounds.height * room.aspect)
  room.vWin.setContentBounds(bounds)
})

async function deattachVideo (args) {
  const room = await getRoom(args.parentId)
  if (!room || !room.vWin) return
  delete room.id2
  let childRoom = await getRoom(args.id)
  delete childRoom.vWin
  if (!childRoom.cWin) {
    if (childRoom.ws) {
      if (childRoom.wsTimeout) clearTimeout(childRoom.wsTimeout)
      childRoom = await updateRoom({ id: childRoom.id, wsTimeout: null, roomEnded: true })
      childRoom.ws.close()
      delete childRoom.ws
    }
    rooms = rooms.filter(r => r.id !== childRoom.id)
  }
  await sendVideoRoomDetails(room.vWin.webContents, room.id)
  const bounds = room.vWin.getContentBounds()
  room.aspect = 480 / 640
  bounds.width = parseInt(bounds.height * room.aspect)
  room.vWin.setContentBounds(bounds)
}

ipcMain.on('deattachVideo', async (event, args) => {
  deattachVideo(args)
})

ipcMain.on('getVideoRoomDetails', async (event, args) => {
  sendVideoRoomDetails(event.sender, args.id)
})

const updateUsers = async () => {
  const users = db.get('users').value()
  const updates = []
  for (const user of users) {
    updates.push(updateUser(user))
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
