// ==UserScript==
// @name        stackoverflow
// @namespace   stackoverflow@spenibus
// @include     http*://stackoverflow.com/*
// @include     http*://*.stackoverflow.com/*
// @version     20151023-1941
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

        var labels = [
            '-',
            'waiting for review',
            'helpful',
            'declined',
            'disputed',
            'aged away',
        ];

        // pattern
        //var r = /\s*([\d,]+)\s*(.*)/g
        var r = new RegExp('([\\d,]+)\\s*('+labels.join('|')+')', 'g');

        // collect counts
        var stats = {};

        // init to zero
        for(var i of labels) {
            stats[i] = 0;
        }

        // get flags text
        var n = document.getElementById('flag-stat-info-table');
        var s = n.textContent;

        var m;
        while(m = r.exec(s)) {
            m[1] = m[1].replace(',', '');
            stats[m[2]] += parseInt(m[1]);
        }

        var total          = (stats[labels[1]] + stats[labels[2]] + stats[labels[3]] + stats[labels[4]] + stats[labels[5]]) || 0;
        var processedCount = (stats[labels[2]] + stats[labels[3]] + stats[labels[4]]) || 0;

        var factorProcessed = 100 / (processedCount || 1);
        var factorTotal     = 100 / (total || 1);

        var extraFlagsCount = stats[labels[2]] - stats[labels[3]];
        var extraFlags      = Math.floor(extraFlagsCount/10);

        var lost = total
            - stats[labels[1]]
            - stats[labels[2]]
            - stats[labels[3]]
            - stats[labels[4]];

        var ns = document.createElement('div');
        ns.setAttribute('style', 'border:1px solid #000; padding:4px; margin:4px;');
        ns.innerHTML = ''
            +'<table id="spenibus_flags_stats">'
                +'<tr>'
                    +'<td colspan="99">Flags stats</td>'
                +'</tr>'
                +'<tr>'
                    +'<td>'+processedCount+'</td>'
                    +'<td>'+fixedRound(factorTotal * total, 2)+'%</td>'
                    +'<td>'+total+'</td>'
                    +'<td>total</td>'
                +'</tr>'
                +'<tr style="color:#080;">'
                    +'<td>'+fixedRound(factorProcessed * stats[labels[2]], 2)+'%</td>'
                    +'<td>'+fixedRound(factorTotal * stats[labels[2]], 2)+'%</td>'
                    +'<td>'+stats[labels[2]]+'</td>'
                    +'<td>helpful</td>'
                +'</tr>'
                +'<tr style="color:#880;">'
                    +'<td>'+fixedRound(factorProcessed * stats[labels[4]], 2)+'%</td>'
                    +'<td>'+fixedRound(factorTotal * stats[labels[4]], 2)+'%</td>'
                    +'<td>'+stats['disputed']+'</td>'
                    +'<td>disputed</td>'
                +'</tr>'
                +'<tr style="color:#800;">'
                    +'<td>'+fixedRound(factorProcessed * stats[labels[3]], 2)+'%</td>'
                    +'<td>'+fixedRound(factorTotal * stats[labels[3]], 2)+'%</td>'
                    +'<td>'+stats['declined']+'</td>'
                    +'<td>declined</td>'
                +'</tr>'
                +'<tr style="color:#888;">'
                    +'<td></td>'
                    +'<td>'+fixedRound(factorTotal * stats[labels[1]], 2)+'%</td>'
                    +'<td>'+stats[labels[1]]+'</td>'
                    +'<td>waiting</td>'
                +'</tr>'
                +'<tr style="color:#888;">'
                    +'<td></td>'
                    +'<td>'+fixedRound(factorTotal * lost, 2)+'%</td>'
                    +'<td>'+lost+'</td>'
                    +'<td>lost</td>'
                +'</tr>'
                +'<tr>'
                    +'<td colspan="99" class="sep">extra flags<br />'+extraFlags+' ('+extraFlagsCount+')</td>'
                +'</tr>'
                +'<tr>'
                    +'<td colspan="99" class="sep">helpful/declined ratio<br />'
                        +fixedRound(stats[labels[2]]/(stats[labels[3]]||1), 2)+'</td>'
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
            +'#spenibus_flags_stats td:nth-child(2n) {'
                +'background-color:rgba(0,0,0,0.05);'
            +'}'
            +'#spenibus_flags_stats .sep {'
                +'border-top:1px solid #888;'
            +'}'
        );

    }, false);
}




/************************************************************************ EOF */