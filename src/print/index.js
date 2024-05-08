const fs = require('fs')
const path = require('path')
const axios = require('axios')
const {PDFDocument} = require('pdf-lib');
const {print} = require('pdf-to-printer')
const {app} = require("electron");

const download_dir = app.getPath('cache')
//下载文件到指定的文件夹路径下，如果没有的话就创建一下
if (!fs.existsSync(download_dir)) {
  fs.mkdirSync(download_dir, {recursive: true});
}

// 文件下载到本地
function downFile(url, fileName) {
  return new Promise(async (resolve, reject) => {
    const local_path = path.join(download_dir, fileName);
    const fileWriter = fs.createWriteStream(local_path);
    try {
      const response = await axios.get(url, {responseType: "stream"});
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
    fs.rm(filePath, {recursive: true}, (err) => {
      if (err) {
        throw err;
      } else {
      }
    });
  } catch (error) {
    throw error;
  }
}

// 根据图格式做处理
async function embedImage(pdfDoc, imageBuffer, type) {
  switch (type) {
    case 'png':
      return await pdfDoc.embedPng(imageBuffer);
    default:
      return await pdfDoc.embedJpg(imageBuffer);
  }
}

// 图片转PDF进行打印
async function createPDFWithImage(imagePath, type) {
  const pdfDoc = await PDFDocument.create()
  const imageBuffer = fs.readFileSync(imagePath);
  // 将图片转换为数据流
  const pdfImage = await embedImage(pdfDoc, imageBuffer, type)
  // 创建一个页面，并将图片绘制到页面上
  // TODO 处理成合适的图片大小
  const page = pdfDoc.addPage([pdfImage.size().width, pdfImage.size().height]);
  page.drawImage(pdfImage, {
    x: 0,
    y: 0,
    width: pdfImage.size().width,
    height: pdfImage.size().height
  });

  // 将文档保存到文件
  const pdfBytes = await pdfDoc.save();
  const local_path = path.join(download_dir, new Date().getTime() + '.pdf');
  fs.writeFileSync(local_path, pdfBytes);
  return local_path
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
  return new Promise((resolve, reject) => {
    downFile(options.url, new Date().getTime() + '.pdf').then(res => {
      print(res, mergePrintOptions(options)).then(resolve).catch(reject).finally(() => {
        // 打印完毕删除临时文件
        delCacheFile(res)
      })
    }).catch(reject)
  })
}

function mergePrintOptions(options) {
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
  return printOptions
}

// 图片打印
function printImage(options) {
  return new Promise((resolve, reject) => {
    downFile(options.url, new Date().getTime() + '.' + options.type).then(async (res) => {
      try {
        const imagePdfPath = await createPDFWithImage(res, options.type)
        print(imagePdfPath, mergePrintOptions(options)).then(resolve).catch(reject).finally(() => {
          // 打印完毕删除临时文件
          delCacheFile(imagePdfPath)
          delCacheFile(res)
        })
      } catch (e) {
        reject(e)
      }
    }).catch(err => {
      reject(err)
    })
  })
}

function printTask(options) {
  switch (options.type) {
    case 'pdf':
      return printPdf(options)
    case 'jpg':
    case 'png':
    case 'jpeg':
      return printImage(options)
    default:
      return Promise.reject()
  }
}

module.exports = {
  printTask
}
