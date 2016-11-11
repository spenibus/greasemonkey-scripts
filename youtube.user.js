// ==UserScript==
// @name        youtube
// @namespace   greasemonkey@spenibus
// @updateURL   https://github.com/spenibus/greasemonkey-scripts/raw/master/youtube.user.js
// @include     http*://youtube.com/*
// @include     http*://*.youtube.com/*
// @version     20161111-1334
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==


/*******************************************************************************
creation: 2010-11-12 00:00 +0000
*******************************************************************************/




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;




/*******************************************************************************
********************************************************************************
********************************************************************************
******************************* disable ajax page loading (history.pushState) */
if(unsafeWindow.ytspf) {
    unsafeWindow.ytspf.enabled = false;
}




/*******************************************************************************
********************************************************************************
********************************************************************************
***************************************************************** video links */
function videoLinks() {


    // not watch page, abort
    if(loc.pathname != '/watch') {
        return;
    }


    // init box and css
    SGL.css(''
        +'#spenibus_videoLinks {'
            +'display:table;'
            +'white-space:nowrap;'
            +'text-align:right;'
        +'}'
        +'#spenibus_videoLinks > div {'
            +'display:table-row;'
        +'}'
        +'#spenibus_videoLinks > div > div {'
            +'display:table-cell;'
            +'padding:0;'
        +'}'
        // all cells except first
        +'#spenibus_videoLinks > div > div ~ div {'
            +'padding-left:8px;'
        +'}'
        // cell: link
        +'#spenibus_videoLinks > div > div:last-child {'
            +'text-align:left;'
        +'}'
        // hide cells (except first)
        +'#spenibus_videoLinks > div > div ~ div {'
            +'display:none;'
        +'}'
        // hover: show cells
        +':hover > #spenibus_videoLinks > div > div ~ div {'
            +'display:table-cell;'
        +'}'
    );
    var box = SGL.displayBox('spenibus_videoLinks');


    //********************************************* missing configuration, abort
    if(!unsafeWindow.ytplayer) {
        box.set('ytplayer not found');
        return;
    }


    //******************************************************** signature decoder
    // https://www.quora.com/How-can-I-make-a-YouTube-video-downloader-web-application-from-scratch
    // https://github.com/rg3/youtube-dl/blob/9dd8e46a2d0860421b4bb4f616f05e5ebd686380/youtube_dl/extractor/youtube.py#L625
    var sigDecode = (function(){

        // get assets source
        var assets = GM_xmlhttpRequest({
            method:      "GET",
            url:         unsafeWindow.ytplayer.config.assets.js,
            synchronous: true,
        });


        var content = assets.responseText;


        // get original decoder function name
        var funcName = content.match(
           /e\.sig\|\|(\w+)\(/
        )[1];

        // get function body
        var re = new RegExp(funcName+'=(function[\\s\\S]*?)\\n');

        var funcStr = re.exec(content)[1];

        // get object used in function
        var subObj = funcStr.match(
           /;(\w+)\.\w+\(/
        )[1];

        var re = new RegExp('('+subObj+'={[\\s\\S]*?};)');

        var subObjStr = re.exec(content)[1];

        // just eval the stuff, what's the worst that could happen, eh
        eval('var f = ' + funcStr + subObjStr);

        return f;
    })();


    //********************************************************* prepare dash url
    var dashurl = (function() {
        if(unsafeWindow.ytplayer.config.args.dashmpd) {
            var tmp = unsafeWindow.ytplayer.config.args.dashmpd.match(/manifest\/dash\/(.*)/i)[1].split('/');
            var url = '';
            for(i=0; i<tmp.length; i=i+2) {
                url += '&'+unescape(tmp[i])+'='+unescape(tmp[i+1]);
            }
            url = url.substr(1);
            url += '&ratebypass=yes';
            return url;
        }
        return '';
    })();


    //***************************************************************** video id
    var videoId = (function(){
        box.set('fetching video id');

        // video id
        var tmp = document.querySelector('meta[itemprop=videoId]');
        tmp = tmp && tmp.getAttribute
            ? tmp.getAttribute('content')
            : false;

        return tmp;
    })();


    //***************************************************************** duration
    var duration = (function(){
        box.set('fetching duration');

        var tmp = document.querySelector('meta[itemprop=duration]');
        tmp = tmp.content
            ? tmp.content.match(/^PT(\d+)M(\d+)S$/i)
            : [0,0];

        var h = Math.floor(tmp[1]/60);
        var m = tmp[1]%60;
        var s = tmp[2];

        return ('0'+h).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
    })();


    //*********************************************************** published time
    var published = (function(){
        box.set('fetching published time');

        var tmp = {};

        if(!videoId) {
            return tmp;
        }

        var str = GM_xmlhttpRequest({
            method:      "GET",
            url:         'https://www.youtube.com/list_ajax?style=json&action_get_templist=1&video_ids='+videoId,
            synchronous: true,
        });

        tmp.date = JSON.parse(
            str.responseText || '{ "video" : [ { "time_created" : 0 } ] }'
        ).video[0].time_created;

        tmp.date = tmp.date > 0
            ? new Date(tmp.date * 1000)
            : false;

        tmp.formatted = tmp.date ? SGL.timeFormatUTC('Ymd-His', tmp.date)+'-UTC' : '';

        /**
        tmp.formatted = tmp.date
            ? tmp.date.getUTCFullYear()
                +''+('0'+(tmp.date.getUTCMonth()+1)).slice(-2)
                +''+('0'+tmp.date.getUTCDate()).slice(-2)
                +'-'+('0'+tmp.date.getUTCHours()).slice(-2)
                +''+('0'+tmp.date.getUTCMinutes()).slice(-2)
                +''+('0'+tmp.date.getUTCSeconds()).slice(-2)
                +'-UTC'
            : '';
        /**/

        return tmp;
    })();


    //********************************************************************* user
    var user = (function(){
        box.set('fetching user');

        var id = document.querySelector('meta[itemprop=channelId]').getAttribute('content');

        var name = document.querySelector('div[class=yt-user-info] > a[data-ytid='+id+']');
        name = name.text;

        return name;
    })();


    //******************************************************************** title
    var videoTitle = (function(){
        box.set('fetching title');

        var tmp = unsafeWindow.ytplayer.config.args.title
            ? unsafeWindow.ytplayer.config.args.title
            : '';

        return tmp;
    })();


    //************************************************************** build title
    var title = (function(){
        box.set('building title');

        var str = user+' - '+published.formatted+' - '+videoTitle;

        // sanitize: special chars
        str = str.replace(/[\\\/\|\*\?<>:"]/g, '-');

        // sanitize: excessive spaces
        str = str.replace(/\s+/g, ' ');

        return str;
    })();


    //**************************************************** mimetype to extension
    box.set('building ext');
    var mimeToExt = {
        'video/webm'  : 'webm',
        'video/mp4'   : 'mp4',
        'video/x-flv' : 'flv',
        'video/3gpp'  : '3gp',
        'audio/mp4'   : 'm4a',
        'audio/webm'  : 'ogg',
    };


    //************************************************ fmt: number to resolution
    var numberResolution = (function(){
        box.set('building numRes');

        var list = unsafeWindow.ytplayer.config.args.fmt_list;
        if(!list) {
            return;
        }

        var out = {};
        var items = list.split(',');
        for(var i in items) {
            var tmp = items[i].split('/');
            out[tmp[0]] = tmp[1];
        }
        return out;
    })();


    //************************************************************ prepare items
    var items = (function(){
        box.set('preparing items');

        var obj = {
            data  : {},
            order : [],
        };

        var src = '';
        if(unsafeWindow.ytplayer.config.args.url_encoded_fmt_stream_map) {
            src += (src ? ',' : '')+unsafeWindow.ytplayer.config.args.url_encoded_fmt_stream_map;
        }
        if(unsafeWindow.ytplayer.config.args.adaptive_fmts) {
            src += (src ? ',' : '')+unsafeWindow.ytplayer.config.args.adaptive_fmts;
        }

        if(src) {
            var map = src.split(',');

            for(var i=0; i<map.length; i++) {
                var args = map[i].split('&');

                // get data
                var data = {};
                for(var n in args) {
                    var tmp = args[n].split('=');
                    data[tmp[0]] = unescape(tmp[1]);
                }

                // create item
                var item = {};
                item.itag    = data.itag;
                item.title   = title;
                item.ext     = mimeToExt[data.type.split(';')[0]];
                item.size    = data.size    ? data.size    : numberResolution[data.itag];
                item.bitrate = data.bitrate ? data.bitrate : 0;
                item.weight  = data.clen    ? data.clen    : 0;

                // item url
                item.url  = unescape(data.url);

                // add signature, obsolete ?
                item.url += data.s   ? '&signature='+encodeURIComponent(sigDecode(data.s)) : '';
                item.url += data.sig ? '&signature='+encodeURIComponent(data.sig)          : '';

                // add to main object
                obj.data[item.itag] = item;
                obj.order.push(item.itag);
            }
        }

        return obj;
    })();


    //********************************************************* build links list
    var html_items = (function(obj){
        box.set('building links list');
        var str = '';
        for(var i in obj.order) {
            var item = obj.data[obj.order[i]];
            if(item) {
                str += ''
                    +'<div>'
                        +'<div>'+item.itag+'</div>'
                        +'<div>'+(item.size ? item.size : '-')+'</div>'
                        +'<div>'+(item.bitrate ? Math.round(item.bitrate/1024)+' kibps' : '-')+'</div>'
                        +'<div>'+(item.weight ? Math.round(item.weight/1024/1024)+' mio' : '-')+'</div>'
                        +'<div><a href="'+item.url+'">'
                        +'youtube - '+item.title+' - fmt-'+item.itag+'.'+item.ext+'</a></div>'
                    +'</div>';
            }
        }
        return str;
    })(items);


    //******************************************************************* output
    box.set(''
        +'<div>'
            +'<div>fmt</div>'
            +'<div>res</div>'
            +'<div>bitrate</div>'
            +'<div>size</div>'
            +'<div>'+duration+'</div>'
        +'</div>'
        +html_items
    );
}
window.addEventListener('DOMContentLoaded', videoLinks, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************** proxfree links */
function proxfreeLinks() {


    // not watch page, abort
    if(loc.pathname != '/watch') {
        return;
    }


    // init box and css
    SGL.css(''
        // show only first line by default
        +'#spenibus_proxfreeLinks > div ~ div {'
            +'display:none;'
        +'}'
        // show all lines on parent hover
        +':hover > #spenibus_proxfreeLinks > div ~ div {'
            +'display:block;'
        +'}'
    );


    var box = SGL.displayBox('spenibus_proxfreeLinks');
    box.set('<div>pf</div>');


    // get proxfree
    GM_xmlhttpRequest({
       method: 'POST',
       url:    'http://fr.proxfree.com/request.php?do=go',
       data:   'get='+encodeURIComponent(loc.href),
       headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',
        },
        onload: function(r) {
            var lnk = r.responseText.match(/(proxfree\.com\/permalink\.php\?.*\);)/i);
            if(lnk) {
                box.append(
                    '<div><a href="http://fr.'+lnk[0]+'">pf:fr</a></div>'+
                    '<div><a href="http://tx.'+lnk[0]+'">pf:tx</a></div>'
                );
            }
        }
    });
}
window.addEventListener('DOMContentLoaded', proxfreeLinks, false);




/*******************************************************************************
********************************************************************************
********************************************************************************
********************************************************** faster flash wmode */
function wmode() {

    var selectorMap = {
        watch : 'embed#movie_player',
        embed : '#player > embed',
    }


    // page type
    var page = loc.pathname.match(/^\/(watch|embed)/);


    // get player
    var playerNode = page
        ? document.querySelector(selectorMap[page[1]])
        : false;


    // no player, abort
    if(!playerNode) {
        return;
    }


    // set wmode
    playerNode.setAttribute('wmode', 'direct');


    // show success (watch page only)
    if(page[1] == 'watch') {
        var box = SGL.displayBox();
        box.set('<span style="color:green;">wm</span>');
    }
}
window.addEventListener('DOMContentLoaded', wmode, false);