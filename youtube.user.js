// ==UserScript==
// @name        youtube
// @namespace   greasemonkey@spenibus
// @updateURL   https://github.com/spenibus/greasemonkey-scripts/raw/master/youtube.user.js
// @include     http*://youtube.com/*
// @include     http*://*.youtube.com/*
// @version     20171123-0047
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==


/*******************************************************************************
creation: 2010-11-12 00:00 +0000
*******************************************************************************/




/***************************************************************** shorthands */
let SGL = spenibus_greasemonkey_lib;
let loc = document.location;




/*******************************************************************************
********************************************************************************
********************************************************************************
************************* run stuff on initial load and then page transitions */
SGL.onReady(function(){
    videoLinks();
    proxLinks();
});


document.addEventListener('spfdone', function() {
    videoLinks();
    proxLinks();
});




/*******************************************************************************
********************************************************************************
********************************************************************************
***************************************************************** video links */
let videoLinks = function() {


    // not watch page, abort
    if(loc.pathname != '/watch') {
        return;
    }


    // init box and css
    SGL.css('\
        /* ensure full screen player is on top of the display box */\
        #movie_player.ytp-fullscreen {\
            z-index:32769;\
        }\
        #spenibus_videoLinks {\
            display:table;\
            white-space:nowrap;\
            text-align:right;\
        }\
        #spenibus_videoLinks > div > div a {\
            text-decoration:none;\
            color:#00F;\
            display:block;\
        }\
        #spenibus_videoLinks > div > div a:hover {\
            background-color:rgba(0,255,0,0.2);\
        }\
        #spenibus_videoLinks > div {\
            display:table-row;\
        }\
        #spenibus_videoLinks > div > div {\
            display:table-cell;\
            padding:0;\
        }\
        /* all cells except first */\
        #spenibus_videoLinks > div > div ~ div {\
            padding-left:8px;\
        }\
        /* cell: link */\
        #spenibus_videoLinks > div > div:last-child {\
            text-align:left;\
        }\
        /* hide cells (except first) */\
        #spenibus_videoLinks > div > div ~ div {\
            display:none;\
        }\
        /* hover: show cells */\
        :hover > #spenibus_videoLinks > div > div ~ div {\
            display:table-cell;\
        }\
    ');
    let box = SGL.displayBox('spenibus_videoLinks');


    //********************************************* missing configuration, abort
    if(!unsafeWindow.ytplayer) {
        box.set('ytplayer not found');
        return;
    }


    //******************************************************** signature decoder
    // https://www.quora.com/How-can-I-make-a-YouTube-video-downloader-web-application-from-scratch
    // https://github.com/rg3/youtube-dl/blob/9dd8e46a2d0860421b4bb4f616f05e5ebd686380/youtube_dl/extractor/youtube.py#L625


    // default
    box.set('fetching sigDecode');
    let sigDecode = function(){ return 'nosig'; };

    // get the real function, also trying IIFE without parentheses
    !function() {
        // get assets source
        let content = GM_xmlhttpRequest({
            method:      "GET",
            url:         unsafeWindow.ytplayer.config.assets.js,
            synchronous: true,
        }).responseText;

        // move vars declaration outside IIFE so we can access them
        let m = content.match(/{var window=this;(var [\s\S]*?;)/)
        if(!m){
            return;
        }
        let varsDeclaration = m[1];
        content = varsDeclaration + content.replace(varsDeclaration, '');

        // eval the code to access the vars in this scope
        eval(content);

        // get decipher function name
        //var re = /[\$\w]+\.sig\|\|([\$\w]+)\(/i;
        //let re = /\.set\("signature",([\$\w]+)\(/i;
        //set("signature",Gm(

        m = (/\.set\("signature",([\$\w]+)\(/i).exec(content);
        if(!m){
            return;
        }
        let funcName = m[1];

        // bind function to a usable local name
        eval('var f = ' + funcName);

        // finalize export
        sigDecode = function(){
            return f.apply(this, arguments);
        }
    }();


    //***************************************************************** video id
    let videoId = (function(){
        box.set('fetching video id');

        return unsafeWindow.ytplayer.config.args.video_id;
    })();


    //***************************************************************** duration
    let duration = (function(){
        box.set('fetching duration');

        let len = unsafeWindow.ytplayer.config.args.length_seconds;

        let h = Math.floor(len/3600);
        let m = Math.floor((len%3600)/60);
        let s = Math.floor(len%60);

        return ('0'+h).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
    })();


    //*********************************************************** published time
    let published = (function(){
        box.set('fetching published time');

        let pub = {};

        if(!videoId) {
            return pub;
        }

        let str = GM_xmlhttpRequest({
            method:      "GET",
            url:         'https://www.youtube.com/list_ajax?style=json&action_get_templist=1&video_ids='+videoId,
            synchronous: true,
        });

        pub.date = JSON.parse(
            str.responseText || '{ "video" : [ { "time_created" : 0 } ] }'
        ).video[0].time_created;

        pub.date = pub.date > 0
            ? new Date(pub.date * 1000)
            : false;

        pub.formatted = pub.date ? SGL.timeFormatUTC('Ymd-His', pub.date)+'-UTC' : '';

        return pub;
    })();


    //********************************************************************* user
    let user = (function(){
        box.set('fetching user');

        return unsafeWindow.ytplayer.config.args.author;
    })();


    //******************************************************************** title
    let videoTitle = (function(){
        box.set('fetching title');

        return unsafeWindow.ytplayer.config.args.title
            ? unsafeWindow.ytplayer.config.args.title
            : '';
    })();

    //************************************************************** build title
    let title = (function(){
        box.set('building title');

        let str = user+' - '+published.formatted+' - '+videoTitle;

        // sanitize: special chars
        str = str.replace(/[\\\/\|\*\?<>:"]/g, '-');

        // sanitize: excessive spaces
        str = str.replace(/\s+/g, ' ');

        return str;
    })();


    //**************************************************** mimetype to extension
    box.set('building ext');
    let mimeToExt = {
        'video/webm'  : 'webm',
        'video/mp4'   : 'mp4',
        'video/x-flv' : 'flv',
        'video/3gpp'  : '3gp',
        'audio/mp4'   : 'm4a',
        'audio/webm'  : 'ogg',
    };


    //************************************************ fmt: number to resolution
    let numberResolution = (function(){
        box.set('building numRes');

        let list = unsafeWindow.ytplayer.config.args.fmt_list;
        if(!list) {
            return;
        }

        let out = {};
        let items = list.split(',');
        for(let i in items) {
            let tmp = items[i].split('/');
            out[tmp[0]] = tmp[1];
        }
        return out;
    })();


    //************************************************************ prepare items
    let items = (function(){
        box.set('preparing items');

        let obj = {
            data  : {},
            order : [],
        };

        let src = '';
        if(unsafeWindow.ytplayer.config.args.url_encoded_fmt_stream_map) {
            src += (src ? ',' : '')+unsafeWindow.ytplayer.config.args.url_encoded_fmt_stream_map;
        }
        if(unsafeWindow.ytplayer.config.args.adaptive_fmts) {
            src += (src ? ',' : '')+unsafeWindow.ytplayer.config.args.adaptive_fmts;
        }

        if(src) {
            let map = src.split(',');

            for(let i=0; i<map.length; i++) {
                let args = map[i].split('&');

                // get data
                let data = {};
                for(let n in args) {
                    let tmp = args[n].split('=');
                    data[tmp[0]] = unescape(tmp[1]);
                }

                // create item
                let item = {};
                item.itag    = data.itag;
                item.title   = title;
                item.ext     = mimeToExt[data.type.split(';')[0]];
                item.size    = data.size    ? data.size    : numberResolution[data.itag];
                item.bitrate = data.bitrate ? data.bitrate : 0;
                item.weight  = data.clen    ? data.clen    : 0;

                // item url
                item.url  = unescape(data.url);

                // add signature, obsolete ?
                item.url += data && data.s   ? '&signature='+encodeURIComponent(sigDecode(data.s)) : '';
                item.url += data && data.sig ? '&signature='+encodeURIComponent(data.sig)          : '';

                // add to main object
                obj.data[item.itag] = item;
                obj.order.push(item.itag);
            }
        }

        return obj;
    })();


    //********************************************************* build links list
    let html_items = (function(obj){
        box.set('building links list');
        let str = '';
        for(let i in obj.order) {
            let item = obj.data[obj.order[i]];
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


/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************** proxfree links */
let proxLinks = function(){

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

    let box = SGL.displayBox('spenibus_proxfreeLinks');
    box.set('<div>pf</div>');

    // get proxfree
    GM_xmlhttpRequest({
        method: 'POST',
        url:    'https://uk.proxfree.com/request.php?do=go',
        data:   'get='+encodeURIComponent(loc.href),
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',
        },
        onload: function(r) {
            let lnk = r.responseText.match(/(proxfree\.com\/permalink\.php\?.*\);)/i);

            if(lnk) {
                box.append(''
                    +'<div><a href="http://fr.'+lnk[0]+'">pf:fr</a></div>'
                    +'<div><a href="http://uk.'+lnk[0]+'">pf:uk</a></div>'
                    +'<div><a href="http://tx.'+lnk[0]+'">pf:tx</a></div>'
                );
            }
        }
    });
}