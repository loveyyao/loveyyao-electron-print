const server = require("http").createServer();
const {store} = require("../store/index")
const {DEFAULT_PORT} = require("../utils/constant");
const {Notification, app} = require("electron");
const address = require("address");
const {printTask} = require("../print");
const log = require("../utils/log");
// socket.io 服务端，用于创建本地服务
const ioServer = (SOCKET_SERVER = new require("socket.io")(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 10000000000,
  allowEIO3: true,
  cors: {
    origin: (requestOrigin, callback) => {
      // 允许所有域名连接
      callback(null, requestOrigin);
    },
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    allowedHeaders: "*",
    credentials: false
  },
}));

// 获取当前系统 IP、IPV6、MAC 地址
function getAddressAll() {
  return new Promise((resolve) => {
    address.mac(function (err, mac) {
      if (err) {
        resolve({ip: address.ip(), ipv6: address.ipv6(), mac: err});
      } else {
        resolve({ip: address.ip(), ipv6: address.ipv6(), mac});
      }
    });
  });
}

function initServeEvent() {
  // 监听WEB端连接
  ioServer.on("connect", (socket) => {
    // 通知渲染进程已连接
    MAIN_WINDOW.webContents.send("serverConnection", ioServer.engine.clientsCount);
    log('客户端连接')
    // 显示连接通知
    if (store.get("allowNotify")) {
      const notification = new Notification({
        title: "新的连接",
        body: `已建立新的连接，当前连接数：${ioServer.engine.clientsCount}`,
      });
      notification.show();
    }
    // 向 WEB端 发生服务端信息
    getAddressAll().then(res => {
      socket.emit("clientInfo", {
        version: app.getVersion(), // 版本号
        platform: process.platform, // 平台
        arch: process.arch, // 系统架构
        ...res,
        clientUrl: `http://${res.ip}:${store.get("port") || DEFAULT_PORT}` // 客户端地址
      })
    })
    // 请求刷新打印机列表
    socket.on("refreshPrinterList", (taskId) => {
      log('客户端获取打印机')
      const printerList = MAIN_WINDOW.webContents.getPrinters()
      socket.emit("getPrinterList", {
        data: printerList,
        taskId
      });
    });
    /**
     * 文件打印
     * @param options
     * @param {string} options.printer - 将文件发送到指定的打印机
     * @param {string} options.pages - 指定要打印 PDF 文档中的哪些页面
     * @param {string} options.subset - 仅当值为 时打印奇数页odd，仅当值为 时打印偶数页even。
     * @param {string} options.orientation - 提供内容 90 度旋转（不是纸张旋转，纸张旋转必须通过选择打印机默认值进行预设）。
     * @param {string} options.scale - 支持的名称有noscale、shrink、 和fit。
     * @param {boolean} options.monochrome - 以黑白方式打印文档。默认值为false。
     * @param {string} options.side - 支持的名称有duplex、duplexshort、duplexlong和simplex。
     * @param {string} options.bin - 选择要打印到的纸盘。号码或姓名。
     * @param {string} options.paperSize - 指定纸张尺寸。A2、A3、A4、A5、A6、letter、legal、 、tabloid、statement或可从打印机设置中选择的名称。
     * @param {boolean} options.silent - 使错误消息静音。
     * @param {boolean} options.printDialog - 显示此命令行上指示的所有文件的打印对话框。
     * @param {number} options.copies - 指定要打印的份数。
     * @param {string} options.type - 'jpg', 'png', 'jpeg', 'docx', 'pdf'（必填）
     * @param {string} options.url - 文件路径（必填）
     * @param {string} options.name - 文件名（可选）
     * @param {string} options.taskId - 任务ID
     */
    socket.on("doPrint", (options) => {
      if (!options.url) {
        socket.emit('printFinish', {
          taskId: options.taskId,
          success: false,
          err: '文件路径不存在'
        })
        return
      }
      MAIN_WINDOW.webContents.send("doPrint", true);
      printTask(options).then(() => {
        socket.emit('printFinish', {
          taskId: options.taskId,
          success: true
        })
        log('文件打印，参数' + JSON.stringify(options) + '。成功')
      }).catch((err) => {
        socket.emit('printFinish', {
          taskId: options.taskId,
          success: false,
          err
        })
        log('文件打印，参数' + JSON.stringify(options) + '。失败。err:' + JSON.stringify(err))
      }).finally(() => {
        MAIN_WINDOW.webContents.send("doPrint", false);
      })
    })
    // 断开连接
    socket.on("disconnect", () => {
      log('客户端断开连接')
      MAIN_WINDOW.webContents.send("serverConnection", ioServer.engine.clientsCount);
    });
  })
}

function start() {
  server.listen(store.get("port") || DEFAULT_PORT)
  initServeEvent()
}

module.exports = {
  start,
  getAddressAll
}
