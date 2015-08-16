// ==UserScript==
// @name        stackoverflow
// @namespace   stackoverflow@spenibus
// @include     http*://stackoverflow.com/*
// @include     http*://*.stackoverflow.com/*
// @version     20150816-1930
// @require     spenibus-greasemonkey-lib.js
// @grant       unsafeWindow
// ==/UserScript==


/*******************************************************************************
first version: 20150807-0012
*******************************************************************************/




/***************************************************************** shorthands */
var SGL = spenibus_greasemonkey_lib;
var loc = document.location;



function fixedRound(val, len) {
    var p = Math.pow(10, len);
    return (Math.round(val * p) / p).toFixed(len);
}


/***************************************************************** flag stats */
if(loc.pathname.substr(0,19) =='/users/flag-summary') {

    window.addEventListener('DOMContentLoaded', function(){

        // pattern
        var r = /^\s*(\d+)(.*)/gm

        // collect counts
        var stats = {};

        // get flags text
        var n = document.getElementById('flag-stat-info-table');
        var s = n.textContent;

        // matches holder
        var m;


        // init to zero
        for(
            var i of [
                'moderator attention flags',
                'waiting for review',
                'deemed helpful',
                'declined',
                'disputed',
            ]
        ) {
            stats[i] = 0;
        }


        while(m = r.exec(s)) {

            if(!stats[m[2]]) {
                stats[m[2]] = 0;
            }

            stats[m[2]] += parseInt(m[1]);
        }

        var factor = 100 / (stats['moderator attention flags'] || 1); // (stats['deemed helpful'] + stats['declined']);

        var extraFlagsCount = stats['deemed helpful'] - stats['declined'];
        var extraFlags      = Math.floor(extraFlagsCount/10);

        var lost = stats['moderator attention flags']
            - stats['deemed helpful']
            - stats['disputed']
            - stats['declined']
            - stats['waiting for review'];

        var ns = document.createElement('div');
        ns.setAttribute('style', 'border:1px solid #000; padding:4px; margin:4px;');
        ns.innerHTML = ''
            +'<table id="spenibus_flags_stats">'
                +'<tr>'
                    +'<td colspan="99">Flags stats</td>'
                +'</tr>'
                +'<tr>'
                    +'<td>'+stats['moderator attention flags']+'</td>'
                    +'<td>'+fixedRound(factor * stats['moderator attention flags'], 2)+'%</td>'
                    +'<td>total</td>'
                +'</tr>'
                +'<tr style="color:#080;">'
                    +'<td>'+stats['deemed helpful']+'</td>'
                    +'<td>'+fixedRound(factor * stats['deemed helpful'], 2)+'%</td>'
                    +'<td>helpful</td>'
                +'</tr>'
                +'<tr style="color:#880;">'
                    +'<td>'+stats['disputed']+'</td>'
                    +'<td>'+fixedRound(factor * stats['disputed'], 2)+'%</td>'
                    +'<td>disputed</td>'
                +'</tr>'
                +'<tr style="color:#800;">'
                    +'<td>'+stats['declined']+'</td>'
                    +'<td>'+fixedRound(factor * stats['declined'], 2)+'%</td>'
                    +'<td>declined</td>'
                +'</tr>'
                +'<tr style="color:#888;">'
                    +'<td>'+stats['waiting for review']+'</td>'
                    +'<td>'+fixedRound(factor * stats['waiting for review'], 2)+'%</td>'
                    +'<td>waiting</td>'
                +'</tr>'
                +'<tr style="color:#888;">'
                    +'<td>'+lost+'</td>'
                    +'<td>'+fixedRound(factor * lost, 2)+'%</td>'
                    +'<td>lost</td>'
                +'</tr>'
                +'<tr>'
                    +'<td colspan="99" class="sep">extra flags<br />'+extraFlags+' ('+extraFlagsCount+')</td>'
                +'</tr>'
                +'<tr>'
                    +'<td colspan="99" class="sep">helpful/declined ratio<br />'
                        +fixedRound(stats['deemed helpful']/(stats['declined']||1), 2)+'</td>'
                +'</tr>'
            +'</table>';

        n.parentNode.insertBefore(ns, n);

        SGL.css(''
            +'#spenibus_flags_stats {'
                +'width:100%;'
                +'font-weight:bold;'
                +'text-align:right;'
                +'margin:auto;'
            +'}'
            +'#spenibus_flags_stats td {'
                +'padding:0 4px;'
                +'text-align:right;'
            +'}'
            +'#spenibus_flags_stats .sep {'
                +'border-top:1px solid #888;'
            +'}'
        );

    }, false);
}




/************************************************************************ EOF */