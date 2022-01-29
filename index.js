const express = require('express');
const config = require('config'); // see config/default.json
let path = require('path');
const app = express();

const axios = require('axios');// http client to get .json from server

const wport = config.get('webserver.port');
const whost = config.get('webserver.host');

const privkeyfile = config.get('ssh_private_key');

const immutable_dronelist = config.get('dronelist'); // config is immutable by default, not what we want for this list
var dronelist = JSON.parse(JSON.stringify(immutable_dronelist)); // Low-frills deep copy


const fs = require('fs');


// this file 
const Drone_SSH_Manager = require('./tools/ssh-manager.js')

var manager = new Drone_SSH_Manager(dronelist,privkeyfile);


// setup a regular scheduled event, once every minute, using cron-like format.
// https://www.npmjs.com/package/node-schedule
const schedule = require('node-schedule');
const every_minute = schedule.scheduleJob('0,30 * * * * *', async function(){

  console.log('Scheduled SSH task/s are running...');

  // put a rando test file into /tmp to prove we can..
  console.log("A running ssh file-copy...");
  await manager.putFile( '/home/buzz/GCS/AP_Cloud/ap_cloud_was_here.txt','/tmp/ap_cloud_was_here.txt');

  //get uname restults from host as an example
  var ssh_cmd='uname';
  var params_array=['-a'];
  var ssh_cwd='/tmp';
  console.log("A running ssh commands...");
  await manager.runCommand(ssh_cmd,params_array,ssh_cwd);

  // get file listing of /tmp to prove we can
  ssh_cmd='ls';
  params_array=['-aFlrt'];
  ssh_cwd='/tmp';
  console.log("B running ssh commands...");
  //await manager.runCommand(ssh_cmd,params_array,ssh_cwd)  // works, but noisy

  // multiple params, and bash completion works like this:
  ssh_cmd='ls -aFlrt /tmp/ap*';
  params_array=[];
  ssh_cwd='/tmp';
  console.log("C running ssh commands...");
  await manager.runCommand(ssh_cmd,params_array,ssh_cwd);



});

// every 5 minutes
const every_5_mins = schedule.scheduleJob('0 */5 * * * *', async function(){
  
  console.log('Scheduled SSH task/s re-enabled.');

  await manager.re_enable_ssh_all();
  });


// html files/templates are in ./views/, we use the  template engine  'pug' right now
// https://pugjs.org/api/express.html
// https://www.sitepoint.com/a-beginners-guide-to-pug/
// Pug uses indentation to work out which tags are nested inside each other.  whitespace matters in .pug files
app.set('views', './views');
app.set('view engine', 'pug');

// stuff in ./public/xx is accessable as /xx
// https://www.youtube.com/watch?v=sFAT_vTxT9o&ab_channel=dcode 
app.use(express.static('public'))


app.get('/',  (req, res) => {
    res.render('index', { title: 'AP_Cloud', message: 'Welcome to AP_Cloud', dronelist:dronelist, wport:wport, whost:whost })
});

// give each drone a page of its own, by-name
for (let d of dronelist) {

    //eg /drone1
    app.get('/'+d['display_name'],  (req, res) => {
        res.render('drone', { title: 'AP_Cloud', message: 'Welcome to AP_Cloud', dronelist:dronelist, wport:wport, whost:whost, drone: d})
    });

}

const server = app.listen(wport, whost, (err) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`Server is running on ${whost}:${server.address().port}`);
});