/*******************************************************************************
spenibus greasemonkey lib
*******************************************************************************/


spenibus_greasemonkey_lib = {


    /***************************************************************************
    general config
    ***************************************************************************/


    // lib version
    version : 20170319.2354,
    cfg : {
        displayBoxContainerId : 'spenibus_display_box_container',
        genericBoxClass       : 'spenibus_generic_box',
    },




    /***************************************************************************
    debug
    ***************************************************************************/


    /***
    console log shorthand
    ***/
    debug : function(str) {
        console.log(str);
    },




    /***
    print object
    ***/
    print_r : function(obj, ret) {
        var str = JSON.stringify(obj, null, 3)

        // return
        if(ret) {
            return str;
        }

        // output to console
        console.log(str);
    },




    /***************************************************************************
    display
    ***************************************************************************/


    /***
    add css to current document
    ***/
    css : function(str) {
        var node = document.createElement('style');
        node.setAttribute('type', 'text/css');
        node.textContent = str;
        document.head.appendChild(node);
    },




    /***
    display box
    ***/
    displayBox : function(boxId) {

        // get container
        var container = document.getElementById(this.cfg.displayBoxContainerId);

        // container is missing
        if(!container) {

            // create container
            container    = document.createElement('div');
            container.id = this.cfg.displayBoxContainerId;
            document.body.appendChild(container);

            // add style
            this.css(''
                // main style
                +'#'+this.cfg.displayBoxContainerId+' {'
                    +'position:fixed;'
                    +'top:0;'
                    +'left:0;'
                    +'z-index:999999999999;'
                    +'font:bold 10px Tahoma;'
                    +'color:#000;'
                    +'background-color:#FFA;'
                    +'border:1px solid #000;'
                    +'padding:1px;'
                    +'min-width:8px;'
                    +'min-height:8px;'
                    +'max-width:90vw;'
                    +'max-height:90vh;'
                    +'overflow:auto;'
                +'}'
                // pad on hover
                +'#'+this.cfg.displayBoxContainerId+':hover {'
                    +'padding:40px;'
                +'}'
                // hide when empty
                +'#'+this.cfg.displayBoxContainerId+':empty {'
                    +'display:none;'
                +'}'
                // link default color
                +'#'+this.cfg.displayBoxContainerId+' a {'
                    +'color:#00F;'
                +'}'
                // alternate sub boxes bg color
                +'#'+this.cfg.displayBoxContainerId+' > div:nth-child(2n) {'
                    +'background-color:rgba(0,0,0,0.1);'
                +'}'
            );
        }

        // init output object
        var content = {};

        // get box element
        content.node = document.getElementById(boxId);

        // create box if missing
        if(!content.node) {
            content.node    = document.createElement('div');
            content.node.id = boxId;
            container.appendChild(content.node);
        }

        // method: set content to box
        content.set = function(str) {
            content.node.innerHTML = str;
        }

        // method: append content to box
        content.append = function(str) {
            content.node.innerHTML += str;
        }

        // return object
        return content;
    },




    /***
    generic box
    ***/
    genericBox : function(boxId, boxClass) {

        // this is the first generic box added to the document
        if(document.querySelector(this.cfg.genericBoxClass) == null) {

            // add style
            this.css('\
                .'+this.cfg.genericBoxClass+' {\
                    background-color:rgb(255,255,192);\
                    border:1px solid rgb(0,0,0);\
                    font-family:Tahoma;\
                    font-size:11px;\
                    font-weight:bold;\
                    padding:2px 4px;\
                    margin:2px auto;\
                    text-align:left;\
                }\
            ');
        }

        // create box
        var box = document.createElement('div');
        box.id = boxId;
        box.classList.add(this.cfg.genericBoxClass, boxClass);

        return box;
    },




    /***************************************************************************
    time
    ***************************************************************************/


    /***
    format a timestamp in milliseconds to a string in local time
        Y  full year
        m  month, 01-12
        d  day, 01-31
        H  hours, 0-22
        i  minutes, 00-59
        s  seconds, 00-59
        O  timezone offset -1200 +1200
    ***/
    timeFormat : function(str, timestamp) {

        // create date from timestamp
        var time = new Date(timestamp);

        // prepare formatted time string
        var timeStr = str;

        // replace placeholders in string
        timeStr = timeStr.replace('Y', time.getFullYear());
        timeStr = timeStr.replace('m', ('0'+(time.getMonth()+1)).slice(-2));
        timeStr = timeStr.replace('d', ('0'+time.getDate()).slice(-2));
        timeStr = timeStr.replace('H', ('0'+time.getHours()).slice(-2));
        timeStr = timeStr.replace('i', ('0'+time.getMinutes()).slice(-2));
        timeStr = timeStr.replace('s', ('0'+time.getSeconds()).slice(-2));

        // timezone is a little more annoying to replace
        timeStr = timeStr.replace('O', function(){
            var tz  = time.getTimezoneOffset();
            var tzh = Math.floor(Math.abs(tz)/60);
            var tzm = tz%60;
            var tzs = tz/Math.abs(tz);
            return (tzs < 0 ? '-' : '+')
                +('0'+tzh).slice(-2)
                +('0'+tzm).slice(-2);
            });

        // return formatted time string
        return timeStr;
    },




    /***
    format a timestamp in milliseconds to a string in UTC
        Y  full year
        m  month, 01-12
        d  day, 01-31
        H  hours, 0-22
        i  minutes, 00-59
        s  seconds, 00-59
    ***/
    timeFormatUTC : function(str, timestamp) {

        // create date from timestamp
        var time = new Date(timestamp);

        // prepare formatted time string
        var timeStr = str;

        // replace placeholders in string
        timeStr = timeStr.replace('Y', time.getUTCFullYear());
        timeStr = timeStr.replace('m', ('0'+(time.getUTCMonth()+1)).slice(-2));
        timeStr = timeStr.replace('d', ('0'+time.getUTCDate()).slice(-2));
        timeStr = timeStr.replace('H', ('0'+time.getUTCHours()).slice(-2));
        timeStr = timeStr.replace('i', ('0'+time.getUTCMinutes()).slice(-2));
        timeStr = timeStr.replace('s', ('0'+time.getUTCSeconds()).slice(-2));

        // return formatted time string
        return timeStr;
    },




    /***************************************************************************
    events handlers
    ***************************************************************************/


    /***
    run function when window triggers "DOMContentLoaded"
    ***/
    onReady : function(func) {
        var f = function() {
            window.removeEventListener('DOMContentLoaded', f);
            func.apply(this, arguments);
        }
        window.addEventListener('DOMContentLoaded', f, false);
    },




    /***
    run function when window triggers "load"
    ***/
    onLoaded : function(func) {
        var f = function() {
            window.removeEventListener('load', f);
            func.apply(this, arguments);
        }
        window.addEventListener('load', f, false);
    },




    /***
    run function through onReady() when domain matches
    ***/
    domainReady : function(domainName, handlerFunction) {
        if(loc.hostname.substr(domainName.length * -1) == domainName) {
            SGL.onReady(handlerFunction);
        }
    },




    /***************************************************************************
    validators
    ***************************************************************************/




    /***
    check if <str> begins with <lookup>
    ***/
    strBegins : function(str, lookup) {
        return str.substr(0, lookup.length) == lookup;
    },




    /***
    check if <str> ends with <lookup>
    ***/
    strEnds : function(str, lookup) {
        return str.substr(lookup.length * -1) == lookup;
    },




    /***************************************************************************
    misc
    ***************************************************************************/


    /***
    convert a positive integer to an alphanumeric string of base 62
    largest input allowed is 9007199254740992
    http://ecma262-5.com/ELS5_HTML.htm#Section_8.5
    ***/
    int62 : function(num) {

        // parse input as integer
        num = parseInt(num);

        // base 62 dictionary
        var chr = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        chr = chr.split('');

        // prepare output
        var out = '';

        // convert
        while(num > 0) {
            var digit = num%62;
            out = chr[digit]+out;
            num = (num - digit) / 62;
        }

        // return base 62 string
        return out;
    },




    /***
    fix/enhance the CSS of a document
        locationBit
            a part of a location object (href, host, etc)
        locationPattern
            a regex pattern to match in locationBit
        cssData
            the css data to add to the document when the match is positive
    ***/
    cssFix : function(locationBit, locationPattern, cssData) {

        // scope instance locally
        var that = this;

        // locationb pattern matches the location bit
        if(locationPattern.exec(document.location[locationBit])) {

            // add css when ready
            this.onReady(function(){
                that.css(cssData);
            });
        }
    },




    /***
    get url content
    if handler function is missing, sync mode is enabled
    ***/
    getUrl : function(url, handler=null) {

        // no handler supplied, use sync mode
        var syncMode = (handler == null) ? true : false;

        var params = {
            url      : url
            ,method  : 'GET'
            ,onload  : handler
        }

        if(syncMode) {
            params.synchronous = true;
        }

        var xhr = GM_xmlhttpRequest(params);

        if(syncMode) {
            return xhr.responseText;
        }
    },
};




/*******************************************************************************
custom events
*******************************************************************************/


/***
pushState
***/
unsafeWindow.history.pushState = exportFunction(function() {

    // trigger custom event
    dispatchEvent(new Event('pushState'));

    // execute original behaviour
    return history.pushState.apply(history, arguments);
}, unsafeWindow)