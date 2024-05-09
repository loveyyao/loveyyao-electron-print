const {printPdf} = require("./printPdf");
const {printImage} = require("./printImage");

function printTask(options) {
  switch (options.type) {
    case 'pdf':
      return printPdf(options)
    case 'jpg':
    case 'png':
      return printImage(options)
    default:
      return Promise.reject()
  }
}

module.exports = {
  printTask
}
