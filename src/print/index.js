const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { print } = require('pdf-to-printer')

// 文件下载到本地
function downFile(url, fileName) {
  return new Promise(async (resolve, reject) => {
    const download_dir = path.resolve(__dirname, '../', '../assets/cache')
    const local_path = path.join(download_dir, fileName);
    //下载文件到指定的文件夹路径下，如果没有的话就创建一下
    if (!fs.existsSync(download_dir)) {
      fs.mkdirSync(download_dir, { recursive: true });
    }
    const fileWriter = fs.createWriteStream(local_path);
    try {
      const response = await axios.get(url, { responseType: "stream" });
      if (response.status === 200) {
        response.data.pipe(fileWriter);
        fileWriter.on("finish", () => {
          fileWriter.close();
          resolve(local_path);
        });
      } else {
        reject(`Error: ${response}`);
      }
    } catch (error) {
      reject(`Error: ${error}`);
    }
  });
}
function delCacheFile(filePath) {
  try {
    //删除服务上的临时文件夹
    fs.rm(filePath, { recursive: true }, (err) => {
      if (err) {
        throw err;
      } else {
      }
    });
  } catch (error) {
    throw error;
  }
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
 * @param {string} options.url - 文件路径（必填）
 * @param {string} options.taskId - 任务ID
 */
function printPdf(options) {
  const printOptionsKeys = [
    'printer', 'pages', 'subset',
    'orientation', 'scale', 'monochrome',
    'side', 'bin', 'paperSize',
    'silent', 'printDialog', 'copies'
  ]
  const printOptions = {}
  printOptionsKeys.forEach(key => {
    if (options[key]) {
      printOptions[key] = options[key]
    }
  })
  return new Promise((resolve, reject) => {
    downFile(options.url, new Date().getTime() + '.pdf').then(res => {
      print(res, printOptions).then(resolve).catch(reject).finally(() => {
        // 打印完毕删除临时文件
        delCacheFile(res)
      })
    }).catch(reject)
  })
}

function printTask(options) {
  switch (options.type) {
    case 'pdf':
      return printPdf(options)
    default:
      return Promise.reject()
  }
}

module.exports = {
  printTask
}
