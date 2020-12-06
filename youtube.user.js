// ==UserScript==
// @name        youtube
// @namespace   greasemonkey@spenibus
// @updateURL   https://github.com/spenibus/greasemonkey-scripts/raw/master/youtube.user.js
// @include     http*://youtube.com/*
// @include     http*://*.youtube.com/*
// @version     20201206.0123
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




//********************************************************************** routing
if(loc.pathname == '/watch') {
    SGL.onReady(reloadButton);
    SGL.onEvent(['DOMContentLoaded', 'yt-page-data-updated'], e=>{
        SGL.onEvent(['yt-page-data-updated'], run);
        run();
    }, true);
}




//*********************************************************** group stuff to run
function run() {
    videoLinks();
    proxLinks();
}




//********************************************************* manual reload button
function reloadButton() {

    let box = SGL.displayBox('spenibus_reload');

    let btn       = document.createElement('button');
    btn.type      = 'button';
    btn.innerHTML = 'R';
    btn.title     = 'Reload';
    btn.addEventListener('click', run);

    box.node.appendChild(btn);
}




/*******************************************************************************
********************************************************************************
********************************************************************************
***************************************************************** video links */
function videoLinks() {

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
        #spenibus_GmYtLog {\
            display:none;\
        }\
        :hover > #spenibus_GmYtLog {\
            display:block;\
        }\
        #spenibus_videoLinks > div > div a {\
            text-decoration:none;\
            color:#00F;\
            display:block;\
        }\
        #spenibus_videoLinks > div:hover {\
            background-color:rgba(0,255,0,0.2);\
        }\
        #spenibus_videoLinks > div > div a:hover {\
            color:#940;\
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

    let boxLog = SGL.displayBox('spenibus_GmYtLog');
    boxLog.set('');

    let boxMsg = SGL.displayBox('spenibus_GmYtMsg');
    boxMsg.set('');

    let box    = SGL.displayBox('spenibus_videoLinks');
    box.set('');


    //**************************************************************************
    let data = {
        'videoId'        : '',
        'ytplayer'       : {},
        'playlistConfig' : {},
        'duration'       : -1,
        'durationFmt'    : '',
        'created'        : -1,
        'createdFmt'     : '',
        'author'         : '',
        'title'          : '',
        'titleFmt'       : '',
        'streamingData'  : {},
        'sigDecode'      : function(){return 'nosig';},
        'mimeToExt'      : {
            'video/3gpp'  : '3gp',
            'video/mp4'   : 'mp4',
            'video/webm'  : 'webm',
            'video/x-flv' : 'flv',
            'audio/mp4'   : 'm4a',
            'audio/webm'  : 'webm',
        },
        'itagResolution' : {},
        'items'          : [],
        'html'           : '',
    };


    //**************************************************************************
    let processingStep = function(str){
        let node  = document.createElement('div');

        let state = document.createElement('span');
        node.appendChild(state);
        state.innerHTML = '.... ';

        let msg   = document.createElement('span');
        node.appendChild(msg);
        msg.innerHTML = str;

        boxLog.node.appendChild(node);

        return {
            node  : node,
            state : state,
            msg   : msg,
            done  : function(){state.innerHTML = 'done ';},
        };
    };


    //**************************************************************************
    let videoIdGet = function(){
        //box.set('Fetching videoId');
        let step = processingStep('Fetching videoId');

        let m = location.href.match(/[&\?]v=(.*?)($|&)/);
        let tmp = SGL.getDeepProp(m, '1');

        if(tmp) {
            data.videoId = tmp;
            SGL.fireEvent('videoIdReady');
        }

        step.done();
    };


    //************************************************* get config, always fresh
    let configGet = function(){
        //box.set('Fetching config');
        let step = processingStep('Fetching config');

        if(unsafeWindow.ytplayer.config.args.raw_player_response) {
            data.ytplayer = unsafeWindow.ytplayer;
            data.ytplayer.config.args.player_response = data.ytplayer.config.args.raw_player_response;
            configGetCheck(step);
        }
        else {
            SGL.getUrl('https://www.youtube.com/watch?v='+data.videoId, xhr=>{
                let content = xhr.responseText;
                // get DOM from data
                let dom = (new DOMParser()).parseFromString(content, "text/html");
                let scripts = dom.querySelectorAll('script:not([src])')
                let pattern = /var\s*(ytplayer)/;
                for(let script of scripts) {
                    if(script.innerHTML.match(pattern)) {
                        let ytplayer;
                        eval('{'+script.innerHTML.replace(pattern, '$1')+'}');
                        data.ytplayer = ytplayer;
                        data.ytplayer.config.args.player_response = JSON.parse(data.ytplayer.config.args.player_response);
                        configGetCheck(step);
                        break;
                    }
                }
            });
        }
    };


    //*************************************************** check result of config
    let configGetCheck = function(step){
        data.ytplayer
            ? SGL.fireEvent('configReady')
            : box.set('config not found');
        step.done();
    }


    //**************************************************************************
    let configPlaylistGet = function(){
        //box.set('Fetching config playlist');
        let step = processingStep('Fetching config playlist');

        SGL.getUrl('https://www.youtube.com/list_ajax?style=json&action_get_templist=1&video_ids='+data.videoId, xhr=>{

            let tmp = JSON.parse(xhr.responseText);
            tmp = SGL.getDeepProp(tmp, ['video', 0]);

            if(tmp) {
                data.configPlaylist = tmp;
                SGL.fireEvent('configPlaylistReady');
            }
            else {
                box.set('config extra not found');
            }

            step.done();
        });
    };


    //******************************************************** signature decoder
    // get the real decipher function from source
    // 2018-11-18, new strategy, bruteforce the fucker
    // get all functions that take a single arg and use split/join internally,
    // then test them to see if they return something looking like a valid sig
    // https://www.quora.com/How-can-I-make-a-YouTube-video-downloader-web-application-from-scratch
    // https://github.com/rg3/youtube-dl/blob/9dd8e46a2d0860421b4bb4f616f05e5ebd686380/youtube_dl/extractor/youtube.py#L625
    let sigDecodeGet = function(){
        //box.set('Fetching sigDecode');
        let step        = processingStep('Fetching sigDecode');
        let stepAssets  = processingStep(' - Fetching assets');
        let stepCipher  = processingStep(' - Fetching cipher');
        let stepDecoder = processingStep(' - Fetching decoder');

        // get assets source
        SGL.getUrl(data.ytplayer.web_player_context_config.jsUrl, xhr=>{


            let content = xhr.responseText;

            // get vars declaration
            let m = content.match(/window=this;[^]*?var\s*([a-z0-9_\$\s,]+);/i)
            //console.log(content);
            //console.log(m);

            if(!m){
                return 0;
            }

            stepAssets.done();

            // move vars declaration outside the IIFE
            // return them in an array so we can access them easily
            let vs;
            let vsd = m[1];

            let cmd = ''
                +'vs = (z=>{'
                    +'let '+vsd+';'
                    +'{'+content.replace(vsd, '_____')+'}'
                    +'return {'+vsd.replace(/([^\s,]+)/g, "\n'$1':$1")+'};'
                +'})();';

            // eval the code to build the array
            try{
                eval(cmd);
            }catch(e){}

            //let sigSrc = '6FEFBF811C7A8D7B1FEB111B8F2CA9463C41A051D106.8569D2B37D2A6364424D5E3A28BA127AE183FB7A';
            let sigSrc = 'BooBBSLC9PTQNv3HIUChcI4ltUoMtygYUgbi2KwMjHF6GICwuKeDXR2EiFBm332iBnpOA6RZd_iyDOt_Q5kkJgqAKVgIARww2IxgLALA';

            let output;
            let sigDecodePending = true;

            let vk = Object.keys(vs);
            for(let v of vk) {

                let f = vs[v];

                // get ciphered formats
                if(
                    f
                    && f.toString().match(/cipher/)
                ) {
                    // test the func
                    let items = {};
                    try{
                        f(
                            items,
                            data.ytplayer.config.args.player_response.streamingData,
                            {}
                        );
                    }catch(e){}

                    //console.log(items);

                    // parse
                    let list = [];
                    for(let k in items) {
                        if(items[k].match(/itag/)) {
                            list = list.concat(items[k].split(','));
                        }
                    }
                    //console.log(list);

                    list.forEach(item=>{
                        //console.log(item);
                        let args = {};
                        item.split('&').forEach(arg=>{
                            let tmp = arg.split('=');
                            args[tmp[0]] = unescape(tmp[1]);
                        });

                        //data.streamingData.push(args);
                        data.streamingData[args['itag']] = args;
                    });
                    stepCipher.done();
                }


                // get sigDecode
                if(
                    sigDecodePending
                    && f
                    && f.length == 1
                    && f.toString().match(/(split|join).*(split|join)/)
                ) {

                    // test the func
                    try{
                        output = f(sigSrc);
                    }catch(e){}

                    // validate output
                    if(
                        // is a string
                        typeof output === 'string'
                        // is different from the source sig and does not contain it
                        //&& !output != sigSrc
                        && output.indexOf(sigSrc) == -1
                        // matches the sig format
                        && output.match(/^.{90,110}$/)
                        //&& !output.match(/http/)
                        //&& output.match(/^[A-Z\d]{30,50}\.[A-Z\d]{30,50}$/)
                    ) {
                        //console.log(output);
                        // got it, export
                        data.sigDecode = function(){
                            return f.apply(this, arguments);
                        };
                        sigDecodePending = false;
                        stepDecoder.done();
                    }
                }
            }

            //console.log(data.streamingData);

            if(data.sigDecode('') == 'nosig') {
                boxMsg.append('<span style="color:#F00" title="sigDecode not found">&#x26A0;</span>');
            }

            if(data.streamingData.length == 0) {
                boxMsg.append('<span style="color:#F00" title="urls not decoded">&#x26A0;</span>');
            }
            SGL.fireEvent('sigDecodeReady');

            step.done();
        });
    };


    //**************************************************************************
    let durationGet = function(){
        //box.set('Fetching duration');
        let step = processingStep('Fetching duration');

        let tmp = SGL.getDeepProp(data, 'ytplayer.config.args.player_response.videoDetails.lengthSeconds');
        if(tmp) {
            data.duration = tmp;
        }
        SGL.fireEvent('durationReady');

        let h = Math.floor(data.duration/3600);
        let m = Math.floor((data.duration%3600)/60);
        let s = Math.floor(data.duration%60);

        data.durationFmt = ('0'+h).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
        SGL.fireEvent('durationFmtReady');

        step.done();
    };


    //**************************************************************************
    let createdGet = function(){
        //box.set('Fetching created');
        let step = processingStep('Fetching created');

        let tmp = SGL.getDeepProp(data, 'configPlaylist.time_created');

        if(tmp) {
            data.created = tmp;
        }
        SGL.fireEvent('createdReady');

        data.createdFmt = SGL.timeFormatUTC(
            'Ymd-His'
            ,(new Date(data.created * 1000))
        )+'-UTC';
        SGL.fireEvent('createdFmtReady');

        step.done();
    };


    //**************************************************************************
    let authorGet = function(){
        //box.set('Fetching author');
        let step = processingStep('Fetching author');

        let tmp = SGL.getDeepProp(data, 'configPlaylist.author');

        if(tmp) {
            data.author = tmp;
        }
        SGL.fireEvent('authorReady');

        step.done();
    };


    //**************************************************************************
    let titleGet = function(){
        //box.set('Fetching title');
        let step = processingStep('Fetching title');

        let tmp = SGL.getDeepProp(data, 'configPlaylist.title');

        if(tmp) {
            data.title = tmp;
        }
        SGL.fireEvent('titleReady');

        step.done();
    };


    //**************************************************************************
    let titleBuild = function(){
        //box.set('Building title');
        let step = processingStep('Building title');

        let tmp = data.author + ' - ' + data.createdFmt + ' - ' + data.title;

        // sanitize: special chars
        tmp = tmp.replace(/[\\\/\|\*\?<>:"]/g, '-');

        // sanitize: excessive spaces
        tmp = tmp.replace(/\s+/g, ' ');

        data.titleFmt = tmp;

        SGL.fireEvent('titleFmtReady');

        step.done();
    };


    //**************************************************************************
    let itagResolutionBuild = function(){
        //box.set('Building itag resolutions');
        let step = processingStep('Building itag resolutions');

        let tmp = SGL.getDeepProp(data, 'ytplayer.config.args.fmt_list');
        //console.log(data);

        if(tmp) {
            tmp.split(',').forEach(item=>{
                let bits = item.split('/');
                data.itagResolution[bits[0]] =  bits[1];
            });
        }
        SGL.fireEvent('itagResolutionReady');

        step.done();
    };


    //**************************************************************************
    let itemsBuild = function(){
        //box.set('Building items');
        let step = processingStep('Building items');

        // item model
        let itemModel = function() {
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

        //console.log(data.streamingData);

        // build a common source for items from fmt_stream_map and adaptive fmts
        let z = Array().concat(
             SGL.getDeepProp(data, 'ytplayer.config.args.player_response.streamingData.formats'        , [])
            ,SGL.getDeepProp(data, 'ytplayer.config.args.player_response.streamingData.adaptiveFormats', [])
        )
        .forEach(item=>{
            data.streamingData[item['itag']]
                ? data.streamingData[item['itag']] = {...data.streamingData[item['itag']], ...item}
                : data.streamingData[item['itag']] = item;
        });

        //console.log(data.streamingData);

        Object.values(data.streamingData).forEach(src=>{

            let item = new itemModel;

            if(src.itag) {
                item.itag = src.itag;
            }

            if(src.width && src.height) {
                item.resolution = src.width+'x'+src.height;
            }

            if(src.qualityLabel) {
                item.quality = src.qualityLabel;
            }

            if(src.fps) {
                item.quality += src.fps;
            }

            if(src.bitrate) {
                item.bitrate = src.bitrate
            }

            if(src.contentLength) {
                item.weight = src.contentLength;
            }

            item.audioChannels = src.audioChannels
                ? src.audioChannels
                : 0;

            // 2020-10-18 - some data has been relocated
            if(src.signatureCipher) {
                src.signatureCipher.split('&').forEach(s=>{
                    s = s.split('=')
                    if(['s','sp','url'].includes(s[0])) {
                        src[s[0]] = decodeURIComponent((s[1]));
                    }
                });
            }

            item.url = src.url + '&rbuf=4194304';

            // add signature
            if(src.s) {
                item.signed = true;

                item.url = src.url
                    + '&' + (src.sp || 'sig')
                    + '=' +  encodeURIComponent(data.sigDecode(src.s));
            }

            if(src.mimeType) {
                item.ext = data.mimeToExt[src.mimeType.split(';')[0]];
            }
            else if(src.type) {
                item.ext = data.mimeToExt[src.type.split(';')[0]];
            }

            data.items.push(item);
        });

        SGL.fireEvent('itemsReady');

        step.done();
    };


    //**************************************************************************
    let htmlBuild = function(){
        //box.set('Building html');
        let step = processingStep('Building html');

        data.items.forEach(item=>{

            // display flags when applicable
            let flags = '';
            if(item.signed) {
                flags += ' <span class="flag signed" title="signed">&#x1F512;</span>';
            }
            if(item.dashWarn) {
                flags += ' <span class="flag dashWarn" title="dash not ranged">&#x26A0;</span>';
            }

            let audio = item.audioChannels > 0
                ? ' <span class="audio" title="has audio">&#x1F508;</span>'
                : ' <span class="audio mute" title="no audio">&#x1F507;</span>';

            data.html += ''
                +'<div>'
                    +'<div>'+item.itag+'</div>'
                    +'<div>'+item.resolution+'</div>'
                    +'<div>'+audio+'</div>'
                    +'<div>'+item.quality+'</div>'
                    +'<div>'+(item.bitrate ? Math.round(item.bitrate/1024)+' kibps' : '-')+'</div>'
                    +'<div>'+(item.weight ? Math.round(item.weight/1024/1024)+' mio' : '-')+'</div>'
                    +'<div>'+flags+'</div>'
                    +'<div><a href="'+item.url+'">'
                        +'youtube - '+data.titleFmt+' - fmt-'+item.itag+'.'+item.ext+'</a></div>'
                +'</div>';
        });

        box.set(''
            +'<div>'
                +'<div>fmt</div>'
                +'<div>resolution</div>'
                +'<div>audio ch.</div>'
                +'<div>quality</div>'
                +'<div>bitrate</div>'
                +'<div>size</div>'
                +'<div>flags</div>'
                +'<div>'+data.durationFmt+'</div>'
            +'</div>'
            +data.html
        );

        SGL.fireEvent('htmlReady');

        step.done();
        boxLog.set('all done');
    };


    // main thread, make this event-based
    SGL.onEvent(['start'], videoIdGet, true);

    SGL.onEvent(['videoIdReady'], e=>{
        configGet();
        configPlaylistGet();
    }, true);

    SGL.onEvent(['configReady'], e=>{
        durationGet();
        sigDecodeGet();
        itagResolutionBuild();
    }, true);

    SGL.onEvent(['configPlaylistReady'], e=>{
        createdGet();
        authorGet();
        titleGet();
    }, true);

    SGL.onEvent([
        'authorReady',
        'createdFmtReady',
        'titleReady',
    ], titleBuild, true, true);

    SGL.onEvent([
        'configReady',
        'sigDecodeReady',
        'itagResolutionReady',
    ], itemsBuild, true, true);

    SGL.onEvent([
        'itemsReady',
        'titleFmtReady',
    ], htmlBuild, true, true);

    // start
    SGL.fireEvent('start');
}




/*******************************************************************************
********************************************************************************
********************************************************************************
************************************************************** proxfree links */
function proxLinks(){

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
