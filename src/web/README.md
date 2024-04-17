# LoveyyaoPrint 打印 WEB端使用
> 先安装`"socket.io-client" "^4.7.5"`版本

#### main.js
```js
import loveyyaoPrint from './loveyyaoPrint'
Vue.use(loveyyaoPrint)
```
#### App.vue
```js
export default {
  beforeDestroy() {
    this.$loveyyaoPrint.disconnect()
  }
}
```
## 属性

- `socket`：`socket.io-client`对象
- `printerList`：打印机列表
- `clientInfo`：服务端信息
- `connected`：连接状态
## 方法

- `getPrinterList`：获取打印机列表，返回`Promise<Array>`
- `refreshPrinterList`：刷新打印机列表，返回`Promise<Array>`
- `print`：文件打印，返回`Promise<unknown>`
