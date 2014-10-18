/*******************************************************************************
spenibus greasemonkey lib
creation: 2014-10-17 22:19 +0200
  update: 2014-10-17 22:47 +0200
*******************************************************************************/


spenibus_greasemonkey_lib = {


   // lib version
   version : 20141017.2247,




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
};




/************************************************************ pushState event */
unsafeWindow.history.pushState = exportFunction(function() {
   dispatchEvent(new Event('pushState'));
   return history.pushState.apply(history, arguments);
}, unsafeWindow)