const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  Notification,
  Tray,
  Menu
} = require("electron");
const path = require("path");
const server = require("http").createServer();
const {store} = require("./src/store");
const {machineIdSync} = require("node-machine-id");
const {getAddressAll, start} = require("./src/server/index");
const {DEFAULT_PORT, MAIN_TITLE} = require("./src/utils/constant");

const icon = path.join(__dirname, "build/icon.png");
// 主进程
global.MAIN_WINDOW = null;
// 托盘
global.APP_TRAY = null;
// socket.io 服务端
global.SOCKET_SERVER = null;

// 程序初始化
async function initialize() {
  console.log(`Electron Node.js version: ${process.versions.node}`);
  // 限制一个窗口
  const gotTheLock = app.requestSingleInstanceLock();
  const machineId = machineIdSync({original: true})
  if (!gotTheLock) {
    // 销毁所有窗口、托盘、退出应用
    quitAll();
  }

  // 当运行第二个实例时,聚焦到 MAIN_WINDOW 这个窗口
  app.on("second-instance", () => {
    if (MAIN_WINDOW) {
      if (MAIN_WINDOW.isMinimized()) {
        // 将窗口从最小化状态恢复到以前的状态
        MAIN_WINDOW.restore();
      }
      MAIN_WINDOW.focus();
    }
  });

  // 允许渲染进程创建通知
  ipcMain.on("notification", (event, data) => {
    const notification = new Notification(data);
    notification.show();
  });
  // 获取设备ip、mac等信息
  ipcMain.on("getAddress", (event) => {
    getAddressAll().then((obj) => {
      event.sender.send("address", {
        ...obj,
        port: store.get("port") || DEFAULT_PORT,
        machineId
      });
    });
  });
  // 当electron完成初始化
  app.whenReady().then(() => {
    // 创建浏览器窗口
    createWindow();
    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    console.log("==> Loveyyao-print 启动 <==")
  });
}

function quitAll() {
  MAIN_WINDOW && MAIN_WINDOW.destroy();
  APP_TRAY && APP_TRAY.destroy();
  app.quit();
}

// 创建渲染进程 主窗口
async function createWindow() {
  const windowOptions = {
    width: 500, // 窗口宽度
    height: 300, // 窗口高度
    title: store.get("mainTitle") || MAIN_TITLE,
    useContentSize: true, // 窗口大小不包含边框
    center: true, // 居中
    resizable: false, // 不可缩放
    show: !store.get("openAsHidden"), // 显示
    webPreferences: {
      // 设置此项为false后，才可在渲染进程中使用 electron api
      contextIsolation: false,
      nodeIntegration: true,
    },
  };

  // 窗口左上角图标
  if (!app.isPackaged) {
    windowOptions.icon = icon
  }

  // 创建主窗口
  MAIN_WINDOW = new BrowserWindow(windowOptions);

  // 添加加载页面 解决白屏的问题
  loadingView(windowOptions);

  // 初始化系统设置
  systemSetup();

  // 加载主页面
  const indexHtml = path.join("file://", app.getAppPath(), "assets/index.html");
  MAIN_WINDOW.webContents.loadURL(indexHtml);

  // 未打包时打开开发者工具
  if (!app.isPackaged) {
    MAIN_WINDOW.webContents.openDevTools();
  }

  // 退出
  MAIN_WINDOW.on("closed", () => {
    MAIN_WINDOW = null;
    server.close();
  });

  // 点击关闭，最小化到托盘
  MAIN_WINDOW.on("close", (event) => {
    if (store.get("closeType") === "tray") {
      // 最小化到托盘
      MAIN_WINDOW.hide();
      // 隐藏任务栏
      MAIN_WINDOW.setSkipTaskbar(true);
      // 阻止窗口关闭
      event.preventDefault();
    } else {
      // 销毁所有窗口、托盘、退出应用
      quitAll()
    }
  });

  // 主窗口 Dom 加载完毕
  MAIN_WINDOW.webContents.on("dom-ready", async () => {
    try {
      // 本地服务开启端口监听
      start()
    } catch (error) {
      console.error(error);
    }
  });

  // 初始化托盘
  initTray();
  return MAIN_WINDOW;
}

// 加载等待页面，解决主窗口白屏问题
function loadingView(windowOptions) {
  const loadingBrowserView = new BrowserView();
  MAIN_WINDOW.setBrowserView(loadingBrowserView);
  loadingBrowserView.setBounds({
    x: 0,
    y: 0,
    width: windowOptions.width,
    height: windowOptions.height,
  });

  const loadingHtml = path.join("file://", app.getAppPath(), "assets/loading.html");
  loadingBrowserView.webContents.loadURL(loadingHtml);
  // 主窗口 dom 加载完毕，移除 loadingBrowserView
  MAIN_WINDOW.webContents.on("dom-ready", async (event) => {
    MAIN_WINDOW.removeBrowserView(loadingBrowserView);
  });
}

// 初始化系统设置
function systemSetup() {
  // 隐藏菜单栏
  Menu.setApplicationMenu(null);
}

// 初始化托盘
function initTray() {
  APP_TRAY = new Tray(icon);
  // 托盘提示标题
  APP_TRAY.setToolTip("loveyyao-print");
  // 托盘菜单
  const trayMenuTemplate = [
    {
      label: "设置",
      click: () => {
      },
    },
    {
      label: "退出",
      click: () => {
        // 销毁所有窗口、托盘、退出应用
        quitAll()
      },
    },
  ];

  APP_TRAY.setContextMenu(Menu.buildFromTemplate(trayMenuTemplate));

  // 监听点击事件
  APP_TRAY.on("click", function () {
    if (MAIN_WINDOW.isMinimized()) {
      // 将窗口从最小化状态恢复到以前的状态
      MAIN_WINDOW.restore();
      MAIN_WINDOW.setSkipTaskbar(false);
    }
    if (!MAIN_WINDOW.isVisible()) {
      // 主窗口关闭不会被销毁，只是隐藏，重新显示即可
      MAIN_WINDOW.show();
      MAIN_WINDOW.setSkipTaskbar(false);
    }
    if (!MAIN_WINDOW.isFocused()) {
      // 主窗口未聚焦，使其聚焦
      MAIN_WINDOW.focus();
    }
  });
  return APP_TRAY;
}

// 初始化主窗口
initialize();
