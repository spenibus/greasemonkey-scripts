// ==UserScript==
// @name        youtube
// @namespace   greasemonkey@spenibus
// @updateURL   https://github.com/spenibus/greasemonkey-scripts/raw/master/youtube.user.js
// @include     http*://youtube.com/*
// @include     http*://*.youtube.com/*
// @version     20190429-0044
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




//*********************************************************** group stuff to run
let run = function() {
    videoLinks();
    proxLinks();
}


//***************************************************** add manual reload button
{
    // not watch page, abort
    if(loc.pathname != '/watch') {
        return;
    }

    let box = SGL.displayBox('spenibus_reload');

    let btn       = document.createElement('button');
    btn.type      = 'button';
    btn.innerHTML = 'R';
    btn.title     = 'Reload';
    btn.addEventListener('click', z=>{run();});

    box.node.appendChild(btn);
}


//*********************************************** attach to custom yt load event
SGL.onReady(z=>{
    document.addEventListener('yt-page-data-updated', z=>{
        run();
    });
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
        /* ensure full screen player is on top of the display box which should itself be above the top bar */\
        #spenibus_display_box_container {\
            z-index:2000000000 !important;\
        }\
        #movie_player.ytp-fullscreen {\
            z-index:2000000001 !important;\
        }\
        /* internals */\
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
    let boxMsg = SGL.displayBox('spenibus_GmYtMsg');
    let box    = SGL.displayBox('spenibus_videoLinks');


    /*
    get player config
    try page manager data first, default to global config if not avail
    note that global config will be obsolete after navigating away from the initial page
    we still bother to check global config to ensure better background loading
    */
    let ytplayer = {};
    (z=>{
        let node = unsafeWindow.document.getElementById('page-manager');
        ytplayer.config =
            node
            && node.__data__
            && node.__data__.data
            && node.__data__.data.player
                ? node.__data__.data.player
                : unsafeWindow.window.ytplayer.config;
    })();


    //********************************************* missing configuration, abort
    if(!ytplayer.config) {
        box.set('ytplayer config not found');
        return;
    }


    //******************************************************** signature decoder
    // https://www.quora.com/How-can-I-make-a-YouTube-video-downloader-web-application-from-scratch
    // https://github.com/rg3/youtube-dl/blob/9dd8e46a2d0860421b4bb4f616f05e5ebd686380/youtube_dl/extractor/youtube.py#L625


    // default
    box.set('fetching sigDecode');
    let sigDecode = function(){ return 'nosig'; };


    // get the real decipher function from source
    (z=>{
        // get assets source
        let _content = SGL.getUrl(ytplayer.config.assets.js);

        // move vars declaration outside IIFE so we can access them
        let _m = _content.match(/{var window=this;(var [\s\S]*?;)/)
        if(!_m){
            return;
        }

        let _varsDeclaration = _m[1];
        _content = _varsDeclaration + _content.replace(_varsDeclaration, '');

        // eval the code to access the vars in this scope
        eval(_content);

        /*
        get decipher function name
        2018-11-18
        new strategy, bruteforce the fucker
        get all functions that take a single arg and use split/join internally,
        then test them to see if they return something looking like a valid sig
        */
        let _re       = /\n(\w+)=function\(\w\)[^\n]*split[^\n]*join.*\n/g;
        let _test     = '';
        let _cmd      = '';
        let _sigSrc   = '6FEFBF811C7A8D7B1FEB111B8F2CA9463C41A051D106.8569D2B37D2A6364424D5E3A28BA127AE183FB7A';
        let _funcName = '';

        while(_m = _re.exec(_content)) {

            // test the function
            _cmd = '_test = '+_m[1]+'("'+_sigSrc+'");';

            try{
                eval(_cmd);
            }catch(_e){}

            // validate output
            if(
                // is a string
                typeof _test === 'string'
                // is different from the source sig
                && _test !== _sigSrc
                // matches the sig format
                && _test.match(/[A-Z\d]+\.[A-Z\d]+/)
            ) {
                // got it
                _funcName = _m[1];
                break;
            }
        }

        // found nothing
        if(_funcName === ''){
            boxMsg.set('<span style="color:#F00" title="sigDecode not found">&#x26A0;</span>');
            return;
        }

        // bind function to a usable local name
        eval('var _f = ' + _funcName);

        // finalize export
        sigDecode = function(){
            return _f.apply(this, arguments);
        }
    })();


    //***************************************************************** video id
    let videoId = (z=>{
        box.set('fetching video id');
        return ytplayer.config.args.video_id;
    })();


    //***************************************************************** duration
    let durationSec = (z=>{
        box.set('fetching duration');
        return ytplayer.config.args.length_seconds;
    })();


    let duration = (z=>{
        let h = Math.floor(durationSec/3600);
        let m = Math.floor((durationSec%3600)/60);
        let s = Math.floor(durationSec%60);

        return ('0'+h).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
    })();


    //*********************************************************** published time
    let published = (z=>{
        box.set('fetching published time');

        let pub = {};

        if(!videoId) {
            return pub;
        }

        let str = SGL.getUrl('https://www.youtube.com/list_ajax?style=json&action_get_templist=1&video_ids='+videoId);

        pub.date = JSON.parse(
            str || '{ "video" : [ { "time_created" : 0 } ] }'
        ).video[0].time_created;

        pub.date = pub.date > 0
            ? new Date(pub.date * 1000)
            : false;

        pub.formatted = pub.date ? SGL.timeFormatUTC('Ymd-His', pub.date)+'-UTC' : '';

        return pub;
    })();


    //********************************************************************* user
    box.set('fetching user');
    let user = ytplayer.config.args.author;


    //******************************************************************** title
    box.set('fetching title');
    let videoTitle = ytplayer.config.args.title
        ? ytplayer.config.args.title
        : '';


    //************************************************************** build title
    let title = (z=>{
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
    let numberResolution = (z=>{
        box.set('building numRes');

        let list = ytplayer.config.args.fmt_list;
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


    //************************************************** prepare items container
    let items = [];

    // item model
    function itemModel() {
        this.itag       = 0;
        this.resolution = '-';
        this.quality    = '-';
        this.bitrate    = 0;
        this.weight     = 0;
        this.url        = '';
        this.ext        = '';
        this.signed     = false;
        this.dashWarn   = false;
    }


    //****************************** items from fmt_stream_map and adaptive fmts
    (z=>{
        box.set('preparing items (fmt_stream_map / adaptive fmts)');

        // build common source
        let src = '';
        if(ytplayer.config.args.url_encoded_fmt_stream_map) {
            src += (src ? ',' : '')+ytplayer.config.args.url_encoded_fmt_stream_map;
        }
        if(ytplayer.config.args.adaptive_fmts) {
            src += (src ? ',' : '')+ytplayer.config.args.adaptive_fmts;
        }

        // build items
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

                let item = new itemModel;

                item.itag = data.itag;

                if(data.size) {
                    item.resolution = data.size;
                }
                else if(numberResolution[data.itag]) {
                    item.resolution = numberResolution[data.itag];
                }

                if(data.quality_label) {
                    item.quality = data.quality_label+data.fps;
                }

                if(data.bitrate) {
                    item.bitrate =  data.bitrate;
                }

                if(data.clen) {
                    item.weight =  data.clen;
                }

                item.url = unescape(data.url);

                // add signature
                if(data.s || data.sig) {
                    item.signed = true;
                    item.url += data && data.s   ? '&signature='+encodeURIComponent(sigDecode(data.s)) : '';
                    item.url += data && data.sig ? '&signature='+encodeURIComponent(data.sig)          : '';
                }

                item.ext = mimeToExt[data.type.split(';')[0]];

                items.push(item);
            }
        }
    })(items);


    //********************************************************** items from dash
    (z=>{
        box.set('preparing items (dash)');

        let xmlsrc = SGL.getUrl(ytplayer.config.args.dashmpd);

        // get DOM from data
        let xml = (new DOMParser()).parseFromString(xmlsrc, "application/xml");

        // get infos from representations
        let representations = xml.querySelectorAll('AdaptationSet > Representation');
        representations.forEach(function(representation){

            // parse attributes
            let data = {};
            for(let attr of representation.attributes) {
                data[attr.name] = attr.value;
            }

            //let item = {};
            let item = new itemModel;

            // check init src url
            let init = representation.querySelector('SegmentList > Initialization').getAttribute('sourceURL');

            if(!init.match(/^range/)) {
                item.dashWarn = true;
            }

            item.itag = data.id;

            item.resolution = '-';
            if(data.height) {
                item.resolution = data.width+'x'+data.height;
            }

            item.quality = '-';
            if(data.height) {
                item.quality = data.height+'p'+data.frameRate;
            }
            else if(data.audioSamplingRate) {
                item.quality = data.audioSamplingRate+'Hz';
            }

            item.bitrate = data.bandwidth
                ? data.bandwidth
                : 0;

            item.weight = durationSec * item.bitrate / 8;

            item.url = representation.querySelector('BaseURL').textContent;

            item.ext = 'mp4';

            items.push(item);
        });
    })(items);


    //********************************************************* build links list
    let html_items = (obj=>{

        box.set('building links list');

        let str = '';

        for(let item of items) {

            // display flags when applicable
            let flags = '';
            if(item.signed) {
                flags += ' <span class="flag signed" title="signed">&#x1F512;</span>';
            }
            if(item.dashWarn) {
                flags += ' <span class="flag dashWarn" title="dash not ranged">&#x26A0;</span>';
            }

            str += ''
                +'<div>'
                    +'<div>'+item.itag+'</div>'
                    +'<div>'+item.resolution+'</div>'
                    +'<div>'+item.quality+'</div>'
                    +'<div>'+(item.bitrate ? Math.round(item.bitrate/1024)+' kibps' : '-')+'</div>'
                    +'<div>'+(item.weight ? Math.round(item.weight/1024/1024)+' mio' : '-')+'</div>'
                    +'<div>'+flags+'</div>'
                    +'<div><a href="'+item.url+'">'
                        +'youtube - '+title+' - fmt-'+item.itag+'.'+item.ext+'</a></div>'
                +'</div>';
        }

        return str;
    })(items);


    //******************************************************************* output
    box.set(''
        +'<div>'
            +'<div>fmt</div>'
            +'<div>resolution</div>'
            +'<div>quality</div>'
            +'<div>bitrate</div>'
            +'<div>size</div>'
            +'<div>flags</div>'
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