const Store = require("electron-store");
const {DEFAULT_PORT, MAIN_TITLE} = require("../utils/constant");

Store.initRenderer();

const schema = {
  // 端口
  port: {
    type: "number",
    minimum: 10000,
    default: DEFAULT_PORT,
  },
  // 程序标题
  mainTitle: {
    type: "string",
    default: MAIN_TITLE
  },
  // 默认打印机
  defaultPrinter: {
    type: "string",
    default: ''
  },
  // 是否打开隐藏窗口
  openAsHidden: {
    type: "boolean",
    default: false
  },
  // 是否开启通知
  allowNotify: {
    type: "boolean",
    default: true,
  },
  // 点击右上角关闭行为
  closeType: {
    type: "string",
    enum: ["tray", "quit"],
    default: "tray",
  }
}

const store = new Store({schema});

module.exports = {
  store
}
