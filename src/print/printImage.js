const {PDFDocument, PageSizes} = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const {print} = require("pdf-to-printer");
const {downCacheFile,delCacheFile,download_dir} = require("./fileCache");
const {mergePrintOptions} = require("./merge");

// 图片处理
async function embedImage(pdfDoc, imageBuffer, type) {
  switch (type) {
    case 'png':
      return await pdfDoc.embedPng(imageBuffer);
    default:
      return await pdfDoc.embedJpg(imageBuffer);
  }
}

// 将图片按照打印页面比例处理成PDF
function drawImagePage(pdfDoc, pdfImage, options) {
  const paperSize = options.paperSize || 'A4'
  const page = pdfDoc.addPage(PageSizes[paperSize]);
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const imageWidth = pdfImage.size().width
  const imageHeight = pdfImage.size().height
  let width = imageWidth
  let height = imageHeight
  if (imageWidth > pageWidth && imageHeight > pageHeight) {
    // 图片宽高同时超出page宽高时
    const scale = Math.max(pageWidth / imageWidth, pageHeight / imageHeight)
    width = imageWidth * scale
    height = imageHeight * scale
  } else if (imageWidth > pageWidth) {
    width = pageWidth
    height = imageHeight * (pageWidth / imageWidth)
  } else if (imageHeight > pageHeight) {
    height = pageHeight
    width = imageWidth * (pageHeight / imageHeight)
  }
  page.drawImage(pdfImage, {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height
  });
}

// 图片转PDF进行打印
async function createPDFWithImage(imagePath, options) {
  const pdfDoc = await PDFDocument.create()
  const imageBuffer = fs.readFileSync(imagePath);
  // 将图片转换为数据流
  const pdfImage = await embedImage(pdfDoc, imageBuffer, options.type)
  // 创建一个页面，并将图片绘制到页面上
  drawImagePage(pdfDoc, pdfImage, options)
  // 将文档保存到文件
  const pdfBytes = await pdfDoc.save();
  const local_path = path.join(download_dir, new Date().getTime() + '.pdf');
  fs.writeFileSync(local_path, pdfBytes);
  return local_path
}

// 图片打印
function printImage(options) {
  return new Promise((resolve, reject) => {
    downCacheFile(options.url, new Date().getTime() + '.' + options.type).then(async (res) => {
      try {
        const imagePdfPath = await createPDFWithImage(res, options)
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

module.exports = {
  printImage
}
