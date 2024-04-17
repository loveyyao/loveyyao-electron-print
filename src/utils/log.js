const { access, appendFile, constants, writeFile } = require("node:fs");
const dayjs = require("dayjs");
const path = require("path");

const logs = path.resolve(__dirname, '../', './assets/logs')
function checkLogFile() {
  const filePath = `${logs}/${dayjs().format("YYYY-MM-DD")}.log`;
  return new Promise((resolve, reject) => {
    access(filePath, constants.F_OK, (err) => {
      if (err) {
        writeFile(filePath, "", (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

function log(message) {
  const filePath = `${logs}/${dayjs().format("YYYY-MM-DD")}.log`;
  return new Promise((resolve, reject) => {
    checkLogFile()
      .then(() => {
        const logMessage = `${dayjs().format(
          "YYYY/MM/DD HH:mm:ss"
        )}: ${message}\n`;
        appendFile(filePath, logMessage, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = log;
