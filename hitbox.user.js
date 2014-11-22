// ==UserScript==
// @name        hitbox
// @namespace   greasemonkey@spenibus
// @include     http*://hitbox.tv/*
// @include     http*://*.hitbox.tv/*
// @version     20141122-0224
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==


/*******************************************************************************
creation: 2010-11-21 23:11 +0000
  update: 2014-11-22 02:24 +0000
*******************************************************************************/




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/**************************************************************** format time */
function timeFormat(timestamp) {
   if(timestamp) {
      var date = new Date(timestamp);
      return date.getFullYear()+'-'+
         ('0'+(date.getMonth()+1)).slice(-2)+'-'+
         ('0'+date.getDate()).slice(-2)+' '+
         ('0'+date.getHours()).slice(-2)+'-'+
         ('0'+date.getMinutes()).slice(-2)+'-'+
         ('0'+date.getSeconds()).slice(-2);
   }
   return 0;
}




/************************************** format duration from seconds to h:m:s */
function durationFormat(secs) {
   var h = Math.floor(secs/3600);
   var m = ('0'+Math.floor(secs%3600/60)).slice(-2);
   var s = ('0'+(secs%3600%60)).slice(-2);
   return h+':'+m+':'+s;
}




/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************** reload buttons */
function reloadButtons() {


   SGL.css(''
      // hide by default
      +'#spenibusReload {'
         +'display:none;'
      +'}'
      // show on container hover
      +':hover > #spenibusReload {'
         +'display:block;'
      +'}'
      // button
      +'#spenibusReload button {'
         +'font-weight:bold;'
         +'margin:4px;'
         +'padding:0 4px;'
      +'}'
   );

   var box = SGL.displayBox('spenibusReload');

   // button name : function
   var list = {
      'reload archives' : archives,
   }

   box.set('');
   for(var i in list) {
      var button = document.createElement('button');
      button.textContent = i;
      button.addEventListener('click', list[i], false);
      box.node.appendChild(button);
   }
}
window.addEventListener('DOMContentLoaded', reloadButtons, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
********************************************************************* archive */
function archives() {


   SGL.css(''
      +'#spenibus_archive {'
         +'max-height:400px;'
         +'overflow-y:scroll;'
         +'margin:0;'
         +'padding:0;'
      +'}'
      +'#spenibus_archive * {'
         +'margin:0;'
         +'padding:0;'
      +'}'
      +'#spenibus_archive > .list {'
         +'display:table;'
         +'white-space:nowrap;'
      +'}'
      +'#spenibus_archive > .list > .row {'
         +'display:table-row;'
      +'}'
      +'#spenibus_archive > .list > .row > * {'
         +'display:table-cell;'
         +'padding:0px 2px;'
         +'text-align:right;'
      +'}'
      // cells: grid
      +'#spenibus_archive > .list > .row + .row > * {'
         +'border-top:1px solid #888;'
      +'}'
      +'#spenibus_archive > .list > .row > * + * {'
         +'border-left:1px solid #888;'
      +'}'
      // show only first cell of header row by default
      +'#spenibus_archive > .list > .row > * {'
         +'display:none;'
      +'}'

      +'#spenibus_archive > .list > .row:nth-of-type(1) > *:nth-of-type(1) {'
         +'display:table-cell;'
      +'}'
      // show everything on container hover
      +':hover > #spenibus_archive > .list > .row > * {'
         +'display:table-cell;'
      +'}'
      // hide extra link text
      +'#spenibus_archive .extra {'
         +'display:none;'
      +'}'
      // row hover
      +'#spenibus_archive > .list > .row:hover > * {'
         +'background-color:#FDA;'
      +'}'
   );


   // display box
   var box = SGL.displayBox('spenibus_archive');


   // store stuff
   var vars = {};


   // get media id
   var m = loc.pathname.match(/\/video\/(\d+)/i);


   // no media id found, abort
   if(!m) {
      return;
   }


   // store media id
   vars.mediaId = m[1];


   // get media
   GM_xmlhttpRequest({
      url    : 'https://www.hitbox.tv/api/media/video/'+vars.mediaId+'?showHidden=true',
      method : 'GET',
      onload : mediaHandler,
   });


   // media handler
   function mediaHandler(xhr) {

      vars.cfg = JSON.parse(xhr.responseText).video[0];
      var playlistConfig = JSON.parse(vars.cfg.media_profiles)[0];

      vars.playlistUrl = 'http://edge.hls.vods.hitbox.tv/static/videos/vods'
         +playlistConfig.url;

      // get playlist
      GM_xmlhttpRequest({
         url    : vars.playlistUrl,
         method : 'GET',
         onload : playlistParser,
      });
   }


   // playlist parser
   function playlistParser(xhr) {

      vars.filePrefix = vars.playlistUrl.match(/(.*\/)/)[1];

      vars.filesCount = 0;
      vars.duration   = 0;

      var lines = xhr.responseText.split('\n');
      vars.files = [];

      for(var i=0; i<lines.length; ++i) {

         var m = lines[i].match(/#EXTINF:([\d\.]+)/i);

         if(m) {

            ++vars.filesCount;

            // millisecond precision
            var d = Math.round(parseFloat(m[1]) * 1000);

            vars.duration += d;

            vars.files.push({
               duration : d,
               file     : lines[++i],
            });
         }
      }
      vars.filesCount = vars.files.length;


      // build list
      buildList();
   }


   // list builder
   function buildList() {


      var m = vars.cfg.media_date_added.match(/^(\d\d\d\d)-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/);
      var timestampStart = 0;
      if(m) {
         timestampStart = (new Date(
            parseInt(m[1]),
            parseInt(m[2])-1,
            parseInt(m[3]),
            parseInt(m[4]),
            parseInt(m[5]),
            parseInt(m[6])
         )).getTime();
      }

      var cleanTitle = vars.cfg.media_title.replace(/[\:*?"<>|/]/g, '_');


      var html = ''
         +'<div class="row header">'
            +'<div class="index">'+vars.filesCount+'</div>'
            +'<div class="start">'+timeFormat(timestampStart)+'</div>'
            +'<div class="duration">'+durationFormat(Math.round(vars.duration/1000))+'</div>'
            +'<div class="file"></div>'
         +'</div>';

      var index = 0;
      var fileStart = timestampStart;
      for(var i in vars.files) {

         var duration = durationFormat(Math.round(vars.files[i].duration/1000))

         var title = 'hitbox'+'-'
            +vars.cfg.media_user_name+'-'
            +timeFormat(fileStart)+'-'
            +cleanTitle;

         html += ''
            +'<div class="row header" title="'+title+'">'
               +'<div class="index">'+(++index)+'</div>'
               +'<div class="start">'+timeFormat(fileStart)+'</div>'
               +'<div class="duration">'+duration+'</div>'
               +'<div class="file">'
                  +'<a href="'+vars.filePrefix+vars.files[i].file+'">'
                     +'<span class="extra">'+title+'-</span>'
                     +vars.files[i].file
                  +'</a>'
               +'</div>'
            +'</div>';

         fileStart += vars.files[i].duration;
      }

      box.set('<div class="list">'+html+'</div>');
   }
}
window.addEventListener('DOMContentLoaded', archives, false);