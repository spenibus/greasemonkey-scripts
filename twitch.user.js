// ==UserScript==
// @name        twitch
// @namespace   greasemonkey@spenibus
// @include     http*://twitch.tv/*
// @include     http*://*.twitch.tv/*
// @version     20180804-1909
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/********************************************************************* config */
var cfg = {
    currentUrl : null,
    // web player client id
    clientId   : 'jzkbprff40iqj646a697cyrvl0zt2m6',
};




/*******************************************************************************
********************************************************************************
********************************************************************************
********************************************************************** events */
unsafeWindow.history.pushState = exportFunction(function() {
    dispatchEvent(new Event('pushState'));
    return history.pushState.apply(history, arguments);
}, unsafeWindow);




unsafeWindow.history.replaceState = exportFunction(function() {
    dispatchEvent(new Event('replaceState'));
    return history.replaceState.apply(history, arguments);
}, unsafeWindow);




/*******************************************************************************
********************************************************************************
********************************************************************************
******************************************************************* functions */




/*******************************************************************************
get url content
if handler function is missing, sync mode is enabled
*******************************************************************************/
function getUrl(url, handler=null) {

    // no handler supplied, use sync mode
    var syncMode = (handler == null) ? true : false;

    var params = {
        url      : url
        ,method  : 'GET'
        ,headers : {
            'Client-ID' : cfg.clientId
        }
        ,onload  : handler
    }

    if(syncMode) {
        params.synchronous = true;
    }

    var xhr = GM_xmlhttpRequest(params);

    if(syncMode) {
        return xhr.responseText;
    }
}




/*********************************************************** get channel name */
function getChannel() {

    var m;
    var n;

    // page is archive video
    if( m = loc.pathname.match(/^\/videos\/(\d+)/) ) {
        var str = getUrl('https://api.twitch.tv/kraken/videos/v'+m[1]);
        n = (str) ? JSON.parse(str).channel.name : null;
    }
    // default method, parse url
    else {
        m = loc.pathname.match(/^\/([^\/]+)/);
        n = m ? m[1].toLowerCase() : null;
    }

    return n;
}




/******************************************************** m3u metadata parser */
// https://tools.ietf.org/html/draft-pantos-http-live-streaming-07
// 3.2.  Attribute Lists
function metaParse(str) {

    var metaObj = {};

    var regexAttr = [
        '[0-9]*',
        '0x[0-9a-f]*',
        '[0-9\.]*',
        '"(.*?)"',
        '[^",\\s]*',
        '[0-9]x[0-9]',
    ];

    var regex = new RegExp(
        '([a-z\\-]+)=('+regexAttr.join('|')+')(,|$)',
        'gi'
    );

    var bits = str.split(':');

    for(var m; m=regex.exec(bits[1]); null) {
        metaObj[m[1]] = m[3] || m[2];
    }

    return [bits[0].substr(7), metaObj];
};




/***************************************************************** m3u parser */
function playlistParse(str) {

    // no carriage returns
    str = str.replace(/\r/g, '');

    // split by newlines
    var lines = str.split('\n');

    // prepare output
    var items = [];

    // go through lines
    for(var i=0; i<lines.length; ++i) {

        // shorthand
        var line = lines[i];

        // new item
        if(!item) {
            var item = {
                meta : {},
                url  : '',
            };
        }


        // metadata: twitch
        if(line.substr(0,14) == '#EXT-X-TWITCH-') {
            var tmp = line.split(':');
            item['meta'][tmp[0]] = tmp.splice(1,tmp.length).join(':');
        }

        // metadata: playlist datetime
        else if(line.substr(0,15) == '#ID3-EQUIV-TDTG') {
            var tmp = line.split(':');
            item['meta'][tmp[0]] = tmp.splice(1,tmp.length).join(':');
        }

        // metadata
        else if(line.substr(0,7) == '#EXT-X-') {
            var tmp = metaParse(line);
            item['meta'][tmp[0]] = tmp[1];
        }

        // extinf
        else if(line.substr(0,7) == '#EXTINF') {
            // don't care
        }

        // unexpected metadata
        else if(line.substr(0,1) == '#') {
            // don't care
        }

        // empty (generally end of file)
        else if(!line) {
            // don't care
        }

        // assume url
        else {
            item['url'] = line;
            items.push(item);

            // reset item
            item = null;
        }
    }

    return items;
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
************************************* auto reload on ajax loading via history */
window.addEventListener('pushState', function(e){

    // poll location until change
    var check = setInterval(function(){

        // detect url change
        if(cfg.currentUrl != loc.href) {

            // stop polling
            clearInterval(check);

            // remember current url
            cfg.currentUrl = loc.href;

            // trigger reload
            window.dispatchEvent(
                new Event('DOMContentLoaded')
            );
        }
    }, 250);
}, false);

/*
window.addEventListener('replaceState', function(e){
    console.log('replaceState');
    console.log(loc);
}, false);
*/




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
            +'<a href="https://player.twitch.tv/?channel='+channel+'">popout</a>'
            +' &bull; '
            +'<a href="https://www.twitch.tv/popout/'+channel+'/chat">chat</a>'
        +'</div>'
    );
}
window.addEventListener('DOMContentLoaded', quickLinks, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************ live video links */
function live() {

    //**************************************************************** some vars
    var vars = {
        channel : getChannel(),
        isLive  : 0, // 0: checking (unknown); 1: yes; 2: no
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


    // create container
    var box = SGL.displayBox('spenibusLiveLinkBox');

    // clear container
    box.set('');


    //****************************************************** abort if no channel
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
        // live checking
        +'#spenibusLiveLinkBox > .live.checking {'
            +'background-color:#F80;'
        +'}'
        // live on
        +'#spenibusLiveLinkBox > .live.on {'
            +'background-color:#0A0;'
        +'}'
        // live off
        +'#spenibusLiveLinkBox > .live.off {'
            +'background-color:#C00;'
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


    //box.set('init live');
    livePresent('init live');


    //************************************ start chain reaction: get live status
    (function(){

        getUrl(
            'https://api.twitch.tv/kraken/streams/'+vars.channel
            ,liveHandler
        );

        //box.set('checking live status');
        livePresent('checking live status');
    })();


    //************************************************************* live handler
    function liveHandler(xhr) {

        var content = JSON.parse(xhr.responseText);

        // not a user, abort
        if(content.status == 404 || content.status == 422) {
            vars.isLive = 2;
            livePresent('not a user');
            return;
        }

        // channel offline, abort
        if(content.stream == null) {
            vars.isLive = 2;
            livePresent('no stream');

            // check for live again in a moment
            window.setTimeout(live, 30000);

            return;
        }

        // channel is live
        vars.isLive  = 1;

        // check for live again in a moment (offline detection really)
        window.setTimeout(live, 60000);

        // some stats
        vars.viewers = content.stream ? content.stream.viewers : 0;

        // get token
        getUrl(
            'https://api.twitch.tv/api/channels/'+vars.channel+'/access_token'
            ,tokenHandler
        );

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
        getUrl(
            vars.playlistUrl
            ,playlistHandler
        );

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


    //************************************************************* present info
    function livePresent(msg) {
        box.set(''
            +'<div class="live '+(['checking', 'on', 'off'][vars.isLive])+'"></div>'
            +'<div class="infos">'
                +'<div>'+(['checking', 'online', 'offline'][vars.isLive])+'</div>'
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


    //************************************************************** format time
    function timeFormat(timestamp) {
        if(timestamp) {
            var date = new Date(timestamp*1000);
            return date.getFullYear()
                +('0'+(date.getMonth()+1)).slice(-2)
                +('0'+date.getDate()).slice(-2)
                +'-'+
                +('0'+date.getHours()).slice(-2)
                +('0'+date.getMinutes()).slice(-2)
                +('0'+date.getSeconds()).slice(-2);
        }
        return 0;
    }


    //************************************ format duration from seconds to h:m:s
    function durationFormat(secs) {
        var h = Math.floor(secs/3600);
        var m = ('0'+Math.floor(secs%3600/60)).slice(-2);
        var s = ('0'+(secs%3600%60)).slice(-2);
        return h+':'+m+':'+s;
    }


    //******************************************************************** style
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
        +'}'
        // vod list
        +'#spenibusVideoLinkBox > div.vod  .list {'
            +'overflow-x:auto;'
            +'max-width:50vw;'
            +'text-align:left;'
        +'}'
        +'#spenibusVideoLinkBox > div.vod  .list > :nth-child(2n) {'
            +'background-color:rgba(0,0,0,0.25)'
        +'}'
        +'#spenibusVideoLinkBox > .header > .status {'
            +'background-color:rgba(128,128,128,0.5)'
        +'}'
        +'#spenibusVideoLinkBox > .header > .status.ready {'
            +'background-color:rgba(0,128,0,0.5)'
        +'}';


    //****************************************************************** process
    // archive data holder
    var data = {
        'chunksMutedCount' : 0,
    };


    // make box
    var box = SGL.displayBox('spenibusVideoLinkBox');


    // clear container
    box.set('');


   //********************************** start the chain reaction: get archive id
    (function(){

        var path = loc.pathname;
        var regexUrl = /\/(videos)\/(\d+)/i;

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
            'b'       : 'a'
            ,'v'      : 'v'
            ,'c'      : 'c'
            ,'videos' : 'v'
        }[data.type] + data.vodId;

        box.set('init archives');

        // set style
        SGL.css(boxStyle);

        // next step
        getVideoInfo();
    })();


    //********************************************************* get archive info
    function getVideoInfo() {

        // update status
        box.set('fetching archive info');

        // store urls
        data.infoUrl  = 'https://api.twitch.tv/kraken/videos/'+data.archiveId;
        
        // fetch info
        getUrl(
            data.infoUrl
            ,xhr=>{
                // store
                data.info = xhr.responseText
                    ? JSON.parse(xhr.responseText)
                    : false;

                // archive start as timestamp and string
                data.start    = Math.round(new Date(data.info.recorded_at).getTime() / 1000);
                data.startStr = SGL.timeFormatUTC('Ymd-His', data.start*1000)+'-UTC';

                // archive duration as timestamp and string
                data.duration    = data.info.length;
                data.durationStr = durationFormat(data.duration);

                // archive title as raw and windows filename safe
                data.title       = data.info.title;
                data.titleClean  = data.title.replace(/[\:*?"<>|/]/g, '_');

                // next step
                getAccessToken();
            }
        );
    }


    //********************************************************* get access token
    function getAccessToken() {

        GM_xmlhttpRequest({
            method  : 'GET',
            url     : 'https://api.twitch.tv/api/vods/'+data.vodId+'/access_token?oauth_token=' + data.token,
            headers : {
                'Client-ID' : cfg.clientId
            },
            onload  : function(xhr){

                var d = JSON.parse(xhr.responseText);
                data.accessToken = d.token;
                data.sig         = d.sig;

                if(!data.accessToken || !data.sig) {
                    return;
                }

                // get master playlist
                vodMasterPlaylist();
            },
        });
    }


    //********************************************** get archive master playlist
    function vodMasterPlaylist() {

        data.vodUrl = 'http://usher.twitch.tv/vod/'+data.vodId
            +'?nauthsig='+data.sig
            +'&nauth='+encodeURIComponent(data.accessToken)
            +'&playlist_include_framerate=true';

        GM_xmlhttpRequest({
            method  : 'GET',
            url     : data.vodUrl,
            headers : {
                'Client-ID' : cfg.clientId
            },
            onload  : vodMasterPlaylistLinks,
        });
    }


    //********************************* master playlist links to video playlists
    function vodMasterPlaylistLinks(xhr) {

        var str   = xhr.responseText;
        var items = playlistParse(str);
        var html  = '';


        //********************************************************* display html
        box.set(''
            +'<div class="header">'
                +'<div class="status">A</div>'
                +'<div>bitrate</div>'
                +'<div>duration<br/>'+data.durationStr+'</div>'
                +'<div>size<br/>(estimated)</div>'
                +'<div>files</div>'
            +'</div>'
        );


        // number of archive items and init processed count
        cfg.archiveItemCount          = items.length;
        cfg.archiveItemProcessedCount = 0;

        // store ref to status element
        cfg.archiveStatusElement = document.querySelector('#spenibusVideoLinkBox > .header > .status');


        //********************************************************* build output
        for(var i=0; i<items.length; ++i) {

            // shorthand
            var item = items[i];

            item.rate = Math.round(item.meta['STREAM-INF'].BANDWIDTH / 1024);
            item.size = Math.round(item.meta['STREAM-INF'].BANDWIDTH * data.duration / 1024 / 1024 / 8);

            item.node = document.createElement('div');

            item.node.setAttribute('data-name', item.meta.MEDIA.NAME);
            item.node.classList.add('vod');

            item.node.innerHTML = '\
                <div></div>\
                <div>'+item.rate+' kbps</a></div>\
                <div>\
                    <a href="'+item.url+'">'+item.meta.MEDIA.NAME+'</a>\
                </div>\
                <div>\
                    <div class="size">'+item.size+' Mio</div>\
                    <div class="filesCount"></div>\
                </div>\
                <div><div class="list"><a href="javascript:void(0);">click to get chunks links</a></div></div>\
                ';

            box.node.appendChild(item.node);

            // run right now to keep values
            (function(item, vodPlaylistLinks){
                item.node.addEventListener('click', function(){

                    // get files
                    GM_xmlhttpRequest({
                        method  : 'GET',
                        url     : item.url,
                        headers : {
                            'Client-ID' : cfg.clientId
                        },
                        context : item,
                        onload  : vodPlaylistLinks,
                    });
                }, false);
            })(item, vodPlaylistLinks);
        }
    }


    //************************************************* vod playlist files links
    function vodPlaylistLinks(xhr) {

        var node      = xhr.context.node;
        var nodeList  = node.querySelector('.list');
        var nodeCount = node.querySelector('.filesCount');


        // archive title as raw and windows filename safe
        data.title      = data.info.title;
        data.titleClean = data.title.replace(/[\:*?"<>|/]/g, '_');


        // get response text
        var str = xhr.responseText;


        // file path
        var path = xhr.finalUrl.split('/');
        path[path.length-1] = '';
        path = path.join('/');


        // parse playlist
        var items = playlistParse(str);


        // init files list
        var list = {};


        // build files list
        for(var i=0; i<items.length; ++i) {

            var url = items[i].url;

            // remove hash (play safe)
            url = url.split('#')[0];

            // remove args
            url = url.split('?')[0];

            // build list of unique files
            list[url] = path+url;
        }


        var meta = items[0]['meta'];


        // build output
        var count          = 0;
        var countMax       = Object.keys(list).length;
        var countMaxLength = countMax.toString().length * -1;
        var html           = '';
        for(var i in list) {

            ++count;

            var fileTitle1 = 'twitch'
                +' - '+data.info.channel.name
                +' - '+SGL.timeFormatUTC('Ymd-His', data.start*1000)+'-UTC'
                +' - ';

            var fileTitle2 = '-'+('000000'+countMax).substr(countMaxLength)
                +' - '+data.titleClean
                +' - '+data.info.broadcast_id
                +' - '+xhr.context.meta.MEDIA.NAME;

            var paddedCount = ('000000'+count).substr(countMaxLength);

            html += ''
                +'<a title="'+fileTitle1+paddedCount+fileTitle2+'" href="'
                    +list[i]+'?start_offset=0&end_offset=9999999">'
                    +'<span class="extra">'+fileTitle1+'</span>'
                    +paddedCount
                    +'<span class="extra">'+fileTitle2+'</span>'
                +'</a>'
                +(count%100 == 0 ? '<br/>' : ' ');
        }

        nodeList.innerHTML  = html;
        nodeCount.innerHTML = 'in '+countMax;

        // count how many archive items have been processed
        cfg.archiveItemProcessedCount++;

        // all archive items have been processed
        if(cfg.archiveItemCount == cfg.archiveItemProcessedCount) {
            cfg.archiveStatusElement.classList.add('ready');
        }
    }
}
window.addEventListener('DOMContentLoaded', archives, false);