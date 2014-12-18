// ==UserScript==
// @name        twitch
// @namespace   greasemonkey@spenibus
// @include     http*://twitch.tv/*
// @include     http*://*.twitch.tv/*
// @version     20141218-2036
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==


/*******************************************************************************
creation: 2012-11-17 00:00 +0000
  update: 2014-12-18 20:36 +0000
*******************************************************************************/




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/********************************************************************* config */
var cfg = {};




/*******************************************************************************
********************************************************************************
********************************************************************************
******************************************************************* functions */




/*********************************************************** get channel name */
function getChannel() {
   var m = loc.pathname.match(/^\/([^\/]+)/);
   return m ? m[1].toLowerCase() : null;
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
      'reload live'     : live,
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
***************************************************************** quick links */
function quickLinks() {

   var channel = getChannel();

   SGL.css(''
      // hide by default
      +'#spenibusQuickLinks {'
         +'white-space:nowrap;'
         +'overflow:hidden;'
         +'display:none;'
      +'}'
      // show on container hover
      +':hover > #spenibusQuickLinks {'
         +'display:block;'
      +'}'
   );

   var box = SGL.displayBox('spenibusQuickLinks');
   box.set(''
      +'<div>'
         +'<a href="http://www.twitch.tv/'+channel+'/popout">popout</a>'
         +' &bull; '
         +'<a href="http://www.twitch.tv/'+channel+'/chat">chat</a>'
      +'</div>'
   );
}
window.addEventListener('DOMContentLoaded', quickLinks, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************ live video links */
function live() {

   //***************************************************************** some vars
   var vars = {
      channel : getChannel(),
      isLive  : false,
      viewers : 0,
      quality : {
         'high'   : '720p',
         'medium' : '480p',
         'low'    : '360p',
         'mobile' : '226p',
      },
      playlistUrl  : '',
      playlistHtml : '',
      streams      : {},
   };


   //******************************************************* abort if no channel
   if(!vars.channel) {
      return;
   }

   // set style
   SGL.css(''
      // box
      +'#spenibusLiveLinkBox {'
         +'white-space:nowrap;'
         +'overflow:hidden;'
      +'}'
      // live
      +'#spenibusLiveLinkBox > .live {'
         +'width:8px;'
         +'height:8px;'
         +'background-color:#888;'
      +'}'
      // live on
      +'#spenibusLiveLinkBox > .live.on {'
         +'background-color:#0A0;'
      +'}'
      // live off
      +'#spenibusLiveLinkBox > .live.off {'
         +'background-color:#A00;'
      +'}'
      // playlist
      +'#spenibusLiveLinkBox > div.playlist {'
         +'text-align:right;'
         +'display:none;'
      +'}'
      // playlist
      +':hover > #spenibusLiveLinkBox > div.playlist {'
         +'display:table;'
      +'}'
      // rows
      +'#spenibusLiveLinkBox > div.playlist > div {'
         +'display:table-row;'
      +'}'
      // cells
      +'#spenibusLiveLinkBox > div.playlist > div > * {'
         +'display:table-cell;'
         +'padding:2px 4px;'
      +'}'
      // cells: vertical grid lines
      +'#spenibusLiveLinkBox > div.playlist > div > * + * {'
         +'border-left:1px solid #888;'
      +'}'
      // cells: horizontal grid lines
      +'#spenibusLiveLinkBox > div.playlist > div + div > * {'
         +'border-top:1px solid #888;'
      +'}'
      // highlight cells on row hover
      +'#spenibusLiveLinkBox > div.playlist > div:hover > * {'
         +'background-color:#FDA;'
      +'}'
      // infos box
      +'#spenibusLiveLinkBox > div.infos {'
         +'display:none;'
      +'}'
      // show infos box
      +':hover > #spenibusLiveLinkBox > div.infos {'
         +'display:block;'
      +'}'
   );

   // create container
   var box = SGL.displayBox('spenibusLiveLinkBox');

   //box.set('init live');
   livePresent('init live');


   //************************************* start chain reaction: get live status
   (function(){

      GM_xmlhttpRequest({
         url    : 'https://api.twitch.tv/kraken/streams/'+vars.channel,
         method : 'GET',
         onload : liveHandler,
      });

      //box.set('checking live status');
      livePresent('checking live status');
   })();


   //************************************************************** live handler
   function liveHandler(xhr) {

      var content = JSON.parse(xhr.responseText);

      // not a user, abort
      if(content.status == 404 || content.status == 422) {
         livePresent('not a user');
         return;
      }

      // channel offline, abort
      if(content.stream == null) {
         livePresent('no stream');
         return;
      }

      // channel is live
      vars.isLive  = true;
      vars.viewers = content.stream ? content.stream.viewers : 0;

      // get token
      GM_xmlhttpRequest({
         url    : 'http://api.twitch.tv/api/channels/'+vars.channel+'/access_token',
         method : 'GET',
         onload : tokenHandler,
      });

      //box.set('fetching token');
      livePresent('fetching token');
   }


   //************************************************************* token handler
   function tokenHandler(xhr) {

      var token = JSON.parse(xhr.responseText);

      // no token or sig, exit
      if(token.token == null || token.sig == null) {
         //box.set('no token/sig');
         livePresent('no token/sig');
         return false;
      }

      vars.token = token.token;
      vars.sig   = token.sig;

      // build playlist url
      vars.playlistUrl = 'http://usher.twitch.tv/api/channel/hls/'+vars.channel+'.m3u8'
         +'?allow_source=true'
         +'&sig='+escape(vars.sig)
         +'&token='+escape(vars.token);

      // get playlist
      GM_xmlhttpRequest({
         url    : vars.playlistUrl,
         method : 'GET',
         onload : playlistHandler,
      });

      //box.set('fetching playlist');
      livePresent('fetching playlist');
   }


   //********************************************************** playlist handler
   function playlistHandler(xhr) {

      var playlist = xhr.responseText;

      // not a playlist, abort
      if(playlist.substr(0,7) != '#EXTM3U') {
         livePresent('not a playlist');
         return;
      }

      // parse playlist
      var rows = playlist.split("\n");
      for(var i=0; i<rows.length; i++) {

         // get meta
         if(rows[i].substr(0,18) == '#EXT-X-STREAM-INF:') {

            // get metadata
            var metadata      = {};
            var metadataPairs = rows[i].substr(18).split(',');

            for(var j=0; j<metadataPairs.length; j++) {

               var pair = metadataPairs[j].split('=');

               if(pair[0] == 'VIDEO') {
                  pair[1] = pair[1].substr(1, pair[1].length-2);
               }

               metadata[pair[0]] = pair[1];
            }

            // get url
            var url = rows[i+1];
            url = url.substr(0,4) == 'http' ? url : null;

            // streams list: add metadata
            vars.streams[metadata.VIDEO] = metadata;

            // streams list: add stream url
            vars.streams[metadata.VIDEO].URL = url;
         }
      }

      // process the streams
      streamsHandler();
   }


   //*********************************************************** streams handler
   function streamsHandler() {

      //box.set('processing streams');
      livePresent('processing streams');

      // init buffer
      var html = '';

      for(var i in vars.streams) {

         var resolution = '-';
         if(vars.streams[i].RESOLUTION) {
            resolution = vars.streams[i].RESOLUTION;
         }
         else if(vars.quality[i]) {
            resolution = vars.quality[i];
         }

         html += ''
            +'<div>'
               +'<a href="'+vars.streams[i].URL+'">'+i+'</a>'
               +'<div>'+resolution+'</div>'
               +'<div>'+Math.round(vars.streams[i].BANDWIDTH/1024)+' kibps</div>'
            +'</div>';
      }

      // finalize
      vars.playlistHtml = ''
         +'<div class="playlist">'
            +'<div>'
               +'<div><a href="'+vars.playlistUrl+'">cfg</a></div>'
               +'<div>resolution</div>'
               +'<div>bitrate</div>'
            +'</div>'
            +html
         +'</div>'

      // present
      livePresent();
   }


   //************************************************************** present info
   function livePresent(msg) {
      box.set(''
         +'<div class="live '+(vars.isLive ? 'on' : 'off')+'"></div>'
         +'<div class="infos">'
            +'<div>'+(vars.isLive ? 'online' : 'offline')+'</div>'
            +'<div>'+vars.viewers+' viewers</div>'
            +'<div>'+(msg ? msg : '')+'</div>'
         +'</div>'
         +vars.playlistHtml
      );
   }
}
window.addEventListener('DOMContentLoaded', live, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
*********************************************************** archives download */
function archives() {


   //*************************************************************** format time
   function timeFormat(timestamp) {
      if(timestamp) {
         var date = new Date(timestamp*1000);
         return date.getFullYear()+'-'+
            ('0'+(date.getMonth()+1)).slice(-2)+'-'+
            ('0'+date.getDate()).slice(-2)+' '+
            ('0'+date.getHours()).slice(-2)+'-'+
            ('0'+date.getMinutes()).slice(-2)+'-'+
            ('0'+date.getSeconds()).slice(-2);
      }
      return 0;
   }


   //************************************* format duration from seconds to h:m:s
   function durationFormat(secs) {
      var h = Math.floor(secs/3600);
      var m = ('0'+Math.floor(secs%3600/60)).slice(-2);
      var s = ('0'+(secs%3600%60)).slice(-2);
      return h+':'+m+':'+s;
   }


   //********************************************************************* style
   var boxStyle = ''
      +'#spenibusVideoLinkBox {'
         +'display:table;'
         +'white-space:nowrap;'
      +'}'
      +'#spenibusVideoLinkBox > div {'
         +'display:table-row;'
      +'}'
      +'#spenibusVideoLinkBox > div > div {'
         +'display:table-cell;'
         +'padding:0px 2px;'
      +'}'
      // show only first cell of header row by default
      +'#spenibusVideoLinkBox > div > div {'
         +'display:none;'
      +'}'
      +'#spenibusVideoLinkBox > div:nth-of-type(1) > div:nth-of-type(1) {'
         +'display:table-cell;'
      +'}'
      // show everything on container hover
      +':hover > #spenibusVideoLinkBox > div > div {'
         +'display:table-cell;'
      +'}'
      // cells: grid
      +'#spenibusVideoLinkBox > div > div + div {'
         +'border-left:1px solid #888;'
      +'}'
      +'#spenibusVideoLinkBox > div + div > div {'
         +'border-top:1px solid #888;'
      +'}'
      // cells default alignment: right
      +'#spenibusVideoLinkBox > div > div {'
         +'text-align:right;'
      +'}'
      // row hover
      +'#spenibusVideoLinkBox > div:hover > div {'
         +'background-color:#FDA;'
      +'}'
      // hide extra link text
      +'#spenibusVideoLinkBox .extra {'
         +'display:none;'
      +'}'
      // chunk audio muted
      +'#spenibusVideoLinkBox .muted {'
         +'color:#A00;'
      +'}'

      // playlist
      +'#spenibusVideoLinkBox > div.playlist {'
         +'display:none;'
      +'}'
      // show everything on container hover
      +':hover > #spenibusVideoLinkBox > div.playlist {'
         +'display:block;'
      +'}';


   //******************************************************************* process
   // archive data holder
   var data = {
      'chunksMutedCount' : 0,
   };
   // box reference
   var box;


   //********************************** start the chain reaction: get archive id
   (function(){

      var path = loc.pathname;
      var regexUrl = /\/([bcv])\/(\d+)/i;

      // get archive id+type
      var m    = path.match(regexUrl);
      var mRef = document.referrer.match(regexUrl);

      // try to get /b/ if current page is /v/ and referrer is /b/
      if(m && m[1] == 'v' && mRef && mRef[1] == 'b') {
         path = document.referrer;
      }

      // get archive id+type
      var m = path.match(regexUrl);

      // abort if no id found
      if(!m) {
         return;
      }

      data.vodId = m[2];
      data.type  = m[1];

      // store archive id
      data.archiveId = {
         'b':'a',
         'v':'v',
         'c':'c'
      }[data.type] + data.vodId;

      // make box
      box = SGL.displayBox('spenibusVideoLinkBox');
      box.set('init archives');

      // set style
      SGL.css(boxStyle);

      // triage: new vod, playlist
      if(data.type == 'v') {
         getToken();
      }
      // triage: old vod
      else {
         getVideoInfo();
      }
   })();


   //************************************************* get video info and chunks
   function getVideoInfo() {

      // update status
      box.set('fetching video info/chunks');

      // store urls
      data.infoUrl  = 'https://api.twitch.tv/kraken/videos/'+data.archiveId+'&oauth_token='+data.token;
      data.chunkUrl = 'https://api.twitch.tv/api/videos/'   +data.archiveId+'&oauth_token='+data.token;

      // get video info
      GM_xmlhttpRequest({
         method : 'GET',
         url    : data.infoUrl,
         onload : function(xhr){

            // store
            data.info = xhr.responseText
               ? JSON.parse(xhr.responseText)
               : false;

            // next step
            buildList();
         },
      });

      // get video chunks
      GM_xmlhttpRequest({
         method : 'GET',
         url    : data.chunkUrl,
         onload : function(xhr){

            // store
            data.chunks = xhr.responseText
               ? JSON.parse(xhr.responseText)
               : false;
            data.chunks = data.chunks && data.chunks.chunks
               ? data.chunks.chunks
               : false;

            // next step
            buildList();
         },
      });
   }


   //********************************************************** build links list
   function buildList() {

      // need both info and chunks to be available
      if(!data.info || !data.chunks) {
         return;
      }

      // update status
      box.set('building list');

      // archive start as timestamp and string
      data.start    = Math.round(new Date(data.info.recorded_at).getTime() / 1000);
      data.startStr = timeFormat(data.start);

      // archive duration as timestamp and string
      data.duration    = data.info.length;
      data.durationStr = durationFormat(data.duration);

      // archive title as raw and windows filename safe
      data.title       = data.info.title;
      data.titleClean  = data.title.replace(/[\:*?"<>|/]/g, '_');

      // available archive qualities
      data.qualities = [];
      for(var quality in data.chunks) {
         data.qualities.push(quality);
      }

      // base quality reference
      data.qualityRef = data.qualities[0];

      // archive chunks count
      data.chunksCount = data.chunks[data.qualityRef].length;

      // init output buffer
      var html = '';

      // init start time offset
      var startOffset = 0;

      // build list
      for(var chunkId=0; chunkId<data.chunksCount; ++chunkId) {

         // chunk start time as timestamp and string
         var chunkStart    = data.start + startOffset;
         var chunkStartStr = timeFormat(chunkStart);

         // chunk duration as timestamp and string
         var chunkDuration    = data.chunks[data.qualityRef][chunkId].length;
         var chunkDurationStr = durationFormat(chunkDuration);

         // is chunk audio muted ?
         var chunkMuted = data.chunks[data.qualityRef][chunkId].upkeep == 'fail'
            ? true
            : false;

         // count muted chunks
         if(chunkMuted) {
            ++data.chunksMutedCount;
         }

         // chunk title
         var chunkTitle = 'twitch'
            +' - '+data.info.channel.name
            +' - '+chunkStartStr
            +' - '+data.titleClean
            +' - '+data.info.broadcast_id;

         // chunk links of available qualities
         var linksHtml = '';
         for(var qualityId=0; qualityId<data.qualities.length; ++qualityId) {

            var quality = data.qualities[qualityId];

            linksHtml += ''
               +'<div><a href="'+data.chunks[quality][chunkId].url+'">'
                  +'<span class="extra">'+chunkTitle+' - </span>'+quality
               +'</a></div>';
         }

         // finalize chunk presentation
         html += ''
         +'<div class="archive" title="'+chunkTitle+'">'
            +'<div>'+(parseInt(chunkId)+1)+'</div>'
            +'<div>'+chunkStartStr+'</div>'
            +'<div>'+chunkDurationStr+'</div>'
            +'<div>'+(chunkMuted ? '<span class="muted">muted</span>' : '')+'</div>'
            +linksHtml
         +'</div>';

         // increment start time offset
         startOffset += data.chunks[data.qualityRef][chunkId].length;
      }


      //*********************************************************** display html
      box.set(''
         +'<div class="header">'
            +'<div>A<br/>'+data.chunksCount+'</div>'
            +'<div>start<br/><a href="'+data.chunkUrl+'">cfg</a></div>'
            +'<div>duration<br/>'+data.durationStr+'</div>'
            +'<div>muted<br/>'+data.chunksMutedCount+'/'+data.chunksCount+'</div>'
         +'</div>'
         +html
      );
   }




   /****************************************************************************
   *****************************************************************************
   *****************************************************************************
   ************************************************** alt: playlist vod (/v/) */




   //***************************************************************** get token
   function getToken() {

      GM_xmlhttpRequest({
         method : 'GET',
         url    : 'https://api.twitch.tv/api/viewer/token.json',
         onload : function(xhr){

            data.token = JSON.parse(xhr.responseText)['token'];

            if(!data.token) {
               return;
            }

            // next step
            getAccessToken();
         },
      });
   }


   //********************************************************** get access token
   function getAccessToken() {

      GM_xmlhttpRequest({
         method : 'GET',
         url    : 'https://api.twitch.tv/api/vods/'+data.vodId+'/access_token?oauth_token=' + data.token,
         onload : function(xhr){

            var d = JSON.parse(xhr.responseText);
            data.accessToken = d.token;
            data.sig         = d.sig;

            if(!data.accessToken || !data.sig) {
               return;
            }

            // next step
            getVodInfo();
         },
      });
   }


   //************************************************* get video info and chunks
   function getVodInfo() {

      data.vodUrl = 'http://usher.twitch.tv/vod/' + data.vodId
         +'?nauthsig='+data.sig+'&nauth='+encodeURIComponent(data.accessToken);

      GM_xmlhttpRequest({
         method : 'GET',
         url    : data.vodUrl,
         onload : function(xhr){

            // next step
            vodMasterPlaylistParse(xhr.responseText);
         },
      });
   }


   //************************************************* get video info and chunks
   function vodMasterPlaylistParse(str) {

      str = str.replace(
         /([\r\n]+)(http.*?)([\r\n]+)/gi,
         '$1<a href="$2">$2</a>$3'
      );

      str = str.replace(
         /[\r\n]+/gi,
         '<br/>\n'
      );

      box.set(''
         +'<div>P</div>'
         +'<div class="playlist">'+str+'</div>');
   }
}
window.addEventListener('DOMContentLoaded', archives, false);