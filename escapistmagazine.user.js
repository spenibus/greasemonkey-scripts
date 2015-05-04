// ==UserScript==
// @name        escapistmagazine
// @namespace   greasemonkey@spenibus
// @include     http*://escapistmagazine.com/*
// @include     http*://*.escapistmagazine.com/*
// @version     20150504-0102
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// ==/UserScript==




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/**************************************************************** video links */
if(loc.pathname.substr(0,13) == '/videos/view/') {

   window.addEventListener('load', function(e){

      // init box and css
      SGL.css(''
         +'#spenibus_videoLinks {'
            +'display:table;'
            +'white-space:nowrap;'
            +'text-align:left;'
         +'}'
         +'#spenibus_videoLinks > * {'
            +'display:table-row;'
         +'}'
         +'#spenibus_videoLinks > * > * {'
            +'display:table-cell;'
            +'padding:1px 2px;'
         +'}'
         // hide all cells except first column
         +'#spenibus_videoLinks > div > div ~ div {'
            +'display:none;'
         +'}'
         // hover: show cells
         +':hover > #spenibus_videoLinks > div > div ~ div {'
            +'display:table-cell;'
         +'}'

      );
      var box = SGL.displayBox('spenibus_videoLinks');
      box.set('ready');

      // link description
      var title = null;
      title = document.title.match(/^(.*)$/i)[1];
      title = title.replace(/[\\\/\|\*\?<>:"]/g, ' - '); // special chars
      title = title.replace(/\s+/g, ' ');                // excessive spaces


      // time
      box.set('time');
      var timeStr = '';

      var timeSrc = document.getElementById('video_detail_header')
         .childNodes[1].innerHTML.match(/^.*\| (.*)$/)[1];

      if(timeSrc) {
         //var timeStr = SGL.timeFormat('Y-m-d H:i:s O', Date.parse(timeSrc));
         var timeStr = SGL.timeFormatUTC('Y-m-d H:i:s', Date.parse(timeSrc))+' GMT';
      }


      // get players
      box.set('players');
      var obj = null;
      for(var i in unsafeWindow.imsVideo.players) {
         obj = unsafeWindow.imsVideo.players[i];
         break;
      }


      // video urls
      box.set('urls');
      var html = '';
      for(var i of obj.playlist.src) {
         html += ''
            +'<div>'
               +'<div>'+i.res+'</div>'
               +'<div>'+i.type+'</div>'
               +'<div><a href="'+i.src+'">TheEscapist-'+timeStr+' - '+title+'</a></div>'
            +'</div>'
      }


      box.set(html);


   }, false);
}