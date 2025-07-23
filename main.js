const { app, BrowserWindow, ipcMain, nativeTheme, Menu, MenuItem, globalShortcut } = require('electron/main')
const path = require('node:path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault()
    selectBluetoothCallback = callback
    const result = deviceList.find((device) => {
      return device.deviceName === 'test'
    })
    if (result) {
      callback(result.deviceId)
    } else {
      // The device wasn't found so we need to either wait longer (eg until the
      // device is turned on) or until the user cancels the request
    }
  })

  ipcMain.on('cancel-bluetooth-request', (event) => {
    selectBluetoothCallback('')
  })

  // Listen for a message from the renderer to get the response for the Bluetooth pairing.
  ipcMain.on('bluetooth-pairing-response', (event, response) => {
    bluetoothPinCallback(response)
  })

  win.webContents.session.setBluetoothPairingHandler((details, callback) => {
    bluetoothPinCallback = callback
    // Send a message to the renderer to prompt the user to confirm the pairing.
    win.webContents.send('bluetooth-pairing-request', details)
  })

  win.loadFile('index.html')

  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      console.log('Pressed Control+I')
      event.preventDefault()
    }
  })

  // Enable context menu for developer tools
  win.webContents.on('context-menu', (e, params) => {
    const contextMenu = new Menu()
    
    // Add inspect element option
    contextMenu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => {
        win.webContents.inspectElement(params.x, params.y)
      }
    }))
    
    contextMenu.popup()
  })
}

const menu = new Menu()
menu.append(new MenuItem({
  label: 'Electron',
  submenu: [{
    role: 'help',
    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+L' : 'Alt+Shift+L',
    click: () => { console.log('Electron rocks!') }
  }]
}))

// Add developer tools menu
menu.append(new MenuItem({
  label: 'Developer',
  submenu: [
    {
      label: 'Toggle Developer Tools',
      accelerator: process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          focusedWindow.webContents.toggleDevTools()
        }
      }
    },
    {
      label: 'Reload',
      accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          focusedWindow.reload()
        }
      }
    },
    {
      label: 'Force Reload',
      accelerator: process.platform === 'darwin' ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          focusedWindow.webContents.reloadIgnoringCache()
        }
      }
    }
  ]
}))

Menu.setApplicationMenu(menu)

ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light'
  } else {
    nativeTheme.themeSource = 'dark'
  }
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system'
})

app.whenReady().then(() => {
  globalShortcut.register('Alt+CommandOrControl+G', () => {
    console.log('Electron loves global shortcuts!')
  })
  ipcMain.handle('ping', () => 'pong')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})