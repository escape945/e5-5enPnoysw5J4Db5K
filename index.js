const express = require('express');
const fs = require('fs');
const cp = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');
const process = require('process');
const expressWs = require('express-ws');
var app = express();
expressWs(app);
var config = {
  port: process.env.X_PORT || 3000,
};

app.get('/generate_204', (req, res) => {
  res.status(204);
  res.send('');
});
app.get('/spawn', (req, res) => {
  spawn();
  res.send('ok');
});
app.get('/sh', (req, res) => {
  res.status(200);
  res.send(fs.readFileSync(path.join(__dirname, './ws_shell.html')).toString());
});
app.ws('/shell', function (ws, req) {
  ws.on('message', function (msg) {
    if (msg) {
      if (msg == '[PING]') {
        ws.send('[PONG]');
        return;
      }
      let child_process = cp.exec(decodeURI(msg), (err, stdout, stderr) => {
        if (err) {
          ws.send(encodeURI(`[${child_process.pid},error]\n${err}`));
        }
      });
      child_process.stdout.on('data', data => {
        ws.send(encodeURI(`[${child_process.pid},stdout]\n${data}`));
      });
      child_process.stderr.on('data', data => {
        ws.send(encodeURI(`[${child_process.pid},stderr]\n${data}`));
      });
      child_process.on('close', code => {
        ws.send(encodeURI(`[${child_process.pid},close]\n${code}`));
      });
    } else {
    }
  });
});
app.get('/view', (req, res) => {
  let fpath = decodeURI(req._parsedUrl.query);
  let name = fpath.substring(fpath.lastIndexOf('/') + 1);
  if (fs.existsSync(fpath)) {
    res.writeHead(200, {
      'Content-Type': 'text/plain;charset=utf-8',
      'Content-Disposition': 'filename=' + name,
    });
    let rs = fs.createReadStream(fpath);
    rs.pipe(res);
  } else {
    res.send('File does not exist.');
  }
});
app.get('/download', (req, res) => {
  let fpath = decodeURI(req._parsedUrl.query);
  let name = fpath.substring(fpath.lastIndexOf('/') + 1);
  if (fs.existsSync(fpath)) {
    res.writeHead(200, {
      'Content-Type': 'application/force-download',
      'Content-Disposition': 'attachment; filename=' + name,
    });
    let rs = fs.createReadStream(fpath);
    rs.pipe(res);
  } else {
    res.send('File does not exist.');
  }
});

let cmdStr = `ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
screen -S e5sub
chmod +x E5SubBot`;
cp.exec(cmdStr, function (err, stdout, stderr) {
  if (err) {
    console.log('[初始化] 命令行执行错误：' + err);
  } else {
    console.log(stdout);
    spawn();
  }
});

let spawn_process = null;

setInterval(() => {
  spawn();
}, 1 * 60 * 60 * 1000);
function spawn() {
  if (spawn_process) process.kill(spawn_process.pid);
  spawn_process = cp.spawn('./E5SubBot');
  spawn_process.stdout.on('data', data => {
    console.log(data.toString());
  });
  spawn_process.on('close', code => {
    // spawn_process = null;
    console.log(`[子进程退出] 退出码: ${code}`);
  });
}

// 监听端口
function listen_port() {
  app.listen(config.port, () => {
    console.log(`[软件] Listening on port ${config.port}`);
  });
}
listen_port();

keepalive();
function keepalive() {
  // 保持唤醒
  let url_host = '';
  url_host = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!url_host) return;
  https
    .get(`https://${url_host}/generate_204`, res => {
      if (res.statusCode == 204) {
      } else {
        console.log('请求错误: ' + res.statusCode);
      }
    })
    .on('error', err => {
      console.log('请求错误: ' + err);
    });
  setTimeout(() => {
    keepalive();
  }, (Math.ceil(Math.random() * 15) * 1000 * 60) / 2);
}
