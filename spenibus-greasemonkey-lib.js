/*******************************************************************************
spenibus greasemonkey lib
*******************************************************************************/


spenibus_greasemonkey_lib = {


   // lib version
   version : 20161108.2125,




   /******************************************** debug: console log shorthand */
   debug : function(str) {
      console.log(str);
   },




   /************************************************************ print object */
   print_r : function(obj, ret) {
      var str = JSON.stringify(obj, null, 3)

      // return
      if(ret) {
         return str;
      }

      // output to console
      console.log(str);
   },




   /********************************************* add css to current document */
   css : function(str) {
      var node = document.createElement('style');
      node.textContent = str;
      document.getElementsByTagName("head")[0].appendChild(node);
   },




   /************************************************************* display box */
   displayBox : function(boxId) {

      var containerId = 'spenibus_display_box_container';

      // get container
      var container = document.getElementById(containerId);

      // create container if missing
      if(!container) {
         container    = document.createElement('div');
         container.id = containerId;
         document.body.appendChild(container);

         this.css(''
            // main style
            +'#'+containerId+' {'
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
            +'}'
            // pad on hover
            +'#'+containerId+':hover {'
               +'padding:40px;'
            +'}'
            // hide when empty
            +'#'+containerId+':empty {'
               +'display:none;'
            +'}'
            // link default color
            +'#'+containerId+' a {'
               +'color:#00F;'
            +'}'
            // alternate sub boxes bg color
            +'#'+containerId+' > div:nth-child(2n) {'
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




   /****************************** time format from timestamp in milliseconds */
   /*
      Y  full year
      m  month, 01-12
      d  day, 01-31
      H  hours, 0-22
      i  minutes, 00-59
      s  seconds, 00-59
      O  timezone offset -1200 +1200
   */
   timeFormat : function(str, timestamp) {

      var time = new Date(timestamp);

      var timeStr = str;

      timeStr = timeStr.replace('Y', time.getFullYear());
      timeStr = timeStr.replace('m', ('0'+(time.getMonth()+1)).slice(-2));
      timeStr = timeStr.replace('d', ('0'+time.getDate()).slice(-2));
      timeStr = timeStr.replace('H', ('0'+time.getHours()).slice(-2));
      timeStr = timeStr.replace('i', ('0'+time.getMinutes()).slice(-2));
      timeStr = timeStr.replace('s', ('0'+time.getSeconds()).slice(-2));

      timeStr = timeStr.replace('O', function(){
         var tz  = time.getTimezoneOffset();
         var tzh = Math.floor(Math.abs(tz)/60);
         var tzm = tz%60;
         var tzs = tz/Math.abs(tz);
         return (tzs < 0 ? '-' : '+')
            +('0'+tzh).slice(-2)
            +('0'+tzm).slice(-2);
      });

      return timeStr;
   },




   /************************** time format UTC from timestamp in milliseconds */
   /*
      Y  full year
      m  month, 01-12
      d  day, 01-31
      H  hours, 0-22
      i  minutes, 00-59
      s  seconds, 00-59
   */
   timeFormatUTC : function(str, timestamp) {

      var time = new Date(timestamp);

      var timeStr = str;

      timeStr = timeStr.replace('Y', time.getUTCFullYear());
      timeStr = timeStr.replace('m', ('0'+(time.getUTCMonth()+1)).slice(-2));
      timeStr = timeStr.replace('d', ('0'+time.getUTCDate()).slice(-2));
      timeStr = timeStr.replace('H', ('0'+time.getUTCHours()).slice(-2));
      timeStr = timeStr.replace('i', ('0'+time.getUTCMinutes()).slice(-2));
      timeStr = timeStr.replace('s', ('0'+time.getUTCSeconds()).slice(-2));

      return timeStr;
   },
};




/************************************************************ pushState event */
unsafeWindow.history.pushState = exportFunction(function() {
   dispatchEvent(new Event('pushState'));
   return history.pushState.apply(history, arguments);
}, unsafeWindow)




/******************************************************************************/
function onReady(func) {
    var f = function() {
        window.removeEventListener('DOMContentLoaded', f);
        func.apply(this, arguments);
    }
    window.addEventListener('DOMContentLoaded', f, false);
}