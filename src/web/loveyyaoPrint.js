import {io} from "socket.io-client";

class LoveyyaoPrint {
  socket = null
  printerList = []
  clientInfo = null
  connected = false
  #taskList = []
  constructor() {
    const socket = io('http://localhost:17525', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      auth: {}
    })
    // 连接
    socket.on('connect', () => {
      this.connected = socket.connected
      if (socket.connected) {
        console.log('服务端连接成功!!!!')
      } else {
        console.error('服务端连接失败!!!!')
      }
    })
    // 获取打印机
    socket.on('getPrinterList', (e) => {
      this.printerList = e.data || []
      const taskId = e.taskId || ''
      const refresh = this.#taskList.find(t => t.taskId === taskId)
      if (refresh) {
        refresh.resolve(this.printerList)
        this.#taskList = this.#taskList.filter(t => t.taskId !== taskId)
      }
    })
    // 打印完成
    socket.on('printFinish', (e) => {
      const taskId = e.taskId || ''
      const success = e.success
      const refresh = this.#taskList.find(t => t.taskId === taskId)
      if (refresh) {
        if (success) {
          refresh.resolve()
        } else {
          refresh.reject(e.err)
        }
        this.#taskList = this.#taskList.filter(t => t.taskId !== taskId)
      }
    })
    // 获取服务端信息
    socket.on('clientInfo', (e) => {
      this.clientInfo = e
    })
    socket.emit('refreshPrinterList')
    this.socket = socket
  }
  generateUUID() {
    let uuid = "";
    for (let i = 0; i < 32; i++) {
      const random = (Math.random() * 16) | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += "-";
      uuid += (i === 12 ? 4 : i === 16 ? (random & 3) | 8 : random).toString(16);
    }
    return uuid;
  }

  /**
   * 获取打印机
   * @returns {Promise<Array>}
   */
  getPrinterList() {
    return this.refreshPrinterList()
  }
  /**
   * 刷新打印机
   * @returns {Promise<Array>}
   */
  refreshPrinterList() {
    let res,rej
    const promise = new Promise((resolve, reject) => {
      res = resolve
      rej = reject
    })
    const taskId = this.generateUUID()
    this.socket.emit('refreshPrinterList', taskId)
    this.#taskList.push({
      type: 'refresh',
      resolve: res,
      reject: rej,
      taskId
    })
    return promise
  }
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
   * @returns {Promise<unknown>}
   */
  print(options) {
    let res,rej
    const promise = new Promise((resolve, reject) => {
      res = resolve
      rej = reject
    })
    const taskId = this.generateUUID()
    this.socket.emit('doPrint', {
      ...options,
      taskId
    })
    this.#taskList.push({
      type: 'print',
      resolve: res,
      reject: rej,
      taskId
    })
    return promise
  }
  disconnect() {
    this.socket.emit('disconnect')
  }
}

function install(Vue) {
  Vue.prototype.$loveyyaoPrint = new LoveyyaoPrint()
}

export default install
