// ==UserScript==
// @name        jeuxvideocom
// @namespace   greasemonkey@spenibus
// @include     http*://jeuxvideo.com/*
// @include     http*://*.jeuxvideo.com/*
// @version     20141214-1945
// @require     spenibus-greasemonkey-lib.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==


/*******************************************************************************
creation: 2008-07-07 00:00 +0000
  update: 2014-12-14 19:45 +0000
*******************************************************************************/




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/******************************************************* video download links */
function videoDownloadLinks() {


   // check url
   if(loc.pathname.substr(0,8) != '/videos/') {

      // wrong url, abort
      return;
   }


   // display box
   var box = SGL.displayBox('spenibus_videoLinks');
   box.set('building links list');


   // vars storage
   var vars = {};


   // css
   vars.css = ''
      +'#spenibus_videoLinks * {'
         +'color:#000;'
         +'font-size:100%;'
      +'}'
      // list
      +'#spenibus_videoLinks > .list {'
         +'display:table;'
         +'white-space:nowrap;'
      +'}'
      // list rows
      +'#spenibus_videoLinks > .list > * {'
         +'display:table-row;'
      +'}'
      // list cells
      +'#spenibus_videoLinks > .list > * > * {'
         +'display:table-cell;'
         +'padding:0 4px;'
      +'}'
      // cell: label
      +'#spenibus_videoLinks > .list > * > *.label {'
         +'text-align:right;'
      +'}'
      // hide cells, except first cell of each row
      +'#spenibus_videoLinks > .list > * > * ~ * {'
         +'display:none;'
      +'}'
      // show cells on hover
      +':hover > #spenibus_videoLinks > .list > * > * ~ * {'
         +'display:table-cell;'
      +'}';


   // get config data
   (function(){
      var node = document.querySelector('meta[property="og:video"]');

      vars.videoId = node.getAttribute('content').match(/id=(\d+)/)[1];
      vars.cfgUrl  = '//'+loc.hostname+'/contenu/medias/video.php?q=config&id='+vars.videoId;

      box.set('looking up <a href="'+vars.cfgUrl+'">config</a>');

      GM_xmlhttpRequest({
         method : 'GET',
         url    : vars.cfgUrl,
         onload : function(r) {
            var data = JSON.parse(r.responseText);
            listBuild(data);
         }
      });
   })();


   // make list
   var listBuild = function(data) {

      var list = '';
      for(var i in data.sources) {

         var item = data.sources[i];

         list += ''
            +'<div>'
               +'<div class="label">'+item.label+'</div>'
               +'<div class="file"><a href="'+item.file+'">'+item.file+'</a></div>'
            +'</div>';


         // css
         SGL.css(vars.css);


         // display
         box.set(''
            +'<a href="'+vars.cfgUrl+'">config</a>'
            +'<div class="list">'+list+'<div>'
         );
      }
   }
}
window.addEventListener('load', videoDownloadLinks, false);