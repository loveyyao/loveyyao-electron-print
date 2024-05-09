const fs = require('fs')
const path = require('path')
const axios = require('axios')
const {app} = require("electron");

const download_dir = app.getPath('cache')
//下载文件到指定的文件夹路径下，如果没有的话就创建一下
if (!fs.existsSync(download_dir)) {
  fs.mkdirSync(download_dir, {recursive: true});
}

// 文件下载到本地
function downCacheFile(url, fileName) {
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

module.exports = {
  downCacheFile,
  delCacheFile,
  download_dir
}
