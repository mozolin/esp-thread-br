/*
DeepSeek:
~~~~~~~~
.style('color', 'var(--color-green)');   // green
.style('color', 'var(--color-red)');     // red
.style('color', 'var(--color-blue)');    // blue
.style('color', 'var(--bs-dark)');       // #000000
.style('color', 'var(--bs-primary)');    // #7e77f8
.style('color', 'var(--bs-secondary)');  // #484e46
.style('color', 'var(--bs-info)');       // #03e2dd
.style('color', 'var(--bs-success)');    // #aad4b0
.style('color', 'var(--bs-light)');      // #ffffff
.style('color', 'var(--bs-danger)');     // #f39191
.style('color', 'var(--bs-gray-600)');   // #908484

Default values:
~~~~~~~~~~~~~~~
Indicator of Leader Device: 40,0,0 (red)
Indicator of Router Device: 0,0,40 (blue)
Indicator of  Child Device: 0,40,0 (green)
*/
var OT_SERVER_PACKAGE_VERSION = "v1.0.0";

/*

Since D3.js v3 doesn't have the html() method,
we'll create our own html() function. So, we can use it like this:

tooltip.html('<strong>HTML</strong> content');

*/
d3.selection.prototype.html = function(value) {
  return arguments.length ? this.each(function() {
    this.innerHTML = value;
  }) : this.node().innerHTML;
};

/*

Since SVG can't directly insert HTML,
we'll create our own function. So, we can use it like this:

const html = '1<br/>2';
addMultilineText(svg, 20, 15, html, '1.2em');

*/
function addMultilineText(svg, x, y, text, lineHeight = '1em') {
  const lines = text.split('<br/>');
  const textElement = svg.append('text')
    .attr('x', x)
    .attr('y', y)
    //.attr('xml:space', 'preserve')
    .attr('fill', 'var(--bs-dark)')
    .style('font-size', '4px')
    .style('font-family', 'Consolas, "Andale Mono", "Lucida Console", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace')
    //.attr('alignment-baseline', 'middle')
  ;

  lines.forEach((line, i) => {
    
    let color = 'var(--bs-dark)';
    if(line.substr(0, 1) === 'l') {
    	color = 'var(--bs-red)';
    	line = line.substr(1);
    }
    if(line.substr(0, 1) === 'r') {
    	color = 'var(--bs-blue)';
    	line = line.substr(1);
    }
    if(line.substr(0, 1) === 'c') {
    	color = 'var(--bs-green)';
    	line = line.substr(1);
    }
    
    textElement.append('tspan')
      .attr('x', x)
      .attr('dy', i === 0 ? 0 : lineHeight)
      .attr('fill', color)
      .attr('xml:space', 'preserve')
      .html(line)
    ;
  });
  
  return textElement;
}


const topology = {
	
};

topology.graph_info = {
    "links": [
        {
            "linkInfo": {
                "inQuality": 3
            },
            "source": {
                "Rloc16": "Rloc16",
                "Role": "Router",
                "weight": 10,
                "index": 0,
            },
            "target": {
                "Rloc16": "Rloc16",
                "Role": "Router",
                "weight": 10,
                "index": 0,
            },
        },
    ],
    "nodes": [
        {
            "Rloc16": "0x8c00",
            "Role": "Router", 
            "ExtAddress": "3ec8ce99965ce39b"
        },
        {
            "Rloc16": "0x7c00",
            "Role": "Leader", 
            "ExtAddress": "4ec85e99975ce39b"
        },
        {
            "Rloc16": "0x6c00",
            "Role": "Router", 
            "ExtAddress": "36893e99965ce39b"
        },
        {
            "Rloc16": "0x8c00",
            "Role": "Child", 
            //"ExtAddress": "3ec8ce99965ce39b"
        },
    ]
	};


var svg = d3.select('.d3graph')
              .append("svg")
              .attr('preserveAspectRatio', 'xMidYMid meet');

var force = d3.layout.force();

var link;
var node;
var trigger_flag = true;

function init(arg) {
  var json, tooltip;
  var scale, len;
  d3.selectAll("svg > *").remove();
  scale = 8;
  len = 150 * Math.sqrt(scale);

  svg.attr('viewBox',
           '0, 0, ' + len.toString(10) + ', ' + (len / (3 / 2)).toString(10));

  //-- List of nodes
  let html = '';
  const tableLenght = 38;
  const roleLenght = 6;
  const extAddressLength = 16;
  if(typeof(topology) !== 'undefined' && typeof(topology.graph_info) !== 'undefined' && typeof(topology.graph_info.nodes) !== 'undefined') {
  	const nodes = topology.graph_info.nodes;
  	html += '-'.repeat(tableLenght)+'<br/>';
  	html += '|  Role  | Rloc16 |    ExtAddress    |<br/>';
  	html += '-'.repeat(tableLenght)+'<br/>';
  	for(let i=0;i<nodes.length;i++) {
  		const node = nodes[i];
  		//console.warn(node);
  		const strExtAddress = (typeof(node.ExtAddress) === 'undefined') ? '-' : node.ExtAddress;
  		if(node.Role == 'Leader') {
  			html += 'l';
  		}
  		if(node.Role == 'Router') {
  			html += 'r';
  		}
  		if(node.Role == 'Child') {
  			html += 'c';
  		}
  		html += '| '+str_pad(node.Role, roleLenght, ' ')+' | '+node.Rloc16+' | '+str_pad(strExtAddress, extAddressLength, ' ', 'both')+' |<br/>';
  	}
  	html += '-'.repeat(tableLenght);
  }

	addMultilineText(svg, 16, 20, html);
  
  
  //-- Leader
  svg.append('circle')
      .attr('cx', 20)
      .attr('cy', 10)
      .attr('r', 3)
      .style('fill', 'var(--bs-red)')
      .style('stroke', 'var(--bs-dark)')
      .style('stroke-width', '0.4px');
  svg.append('text')
      .attr('x', 25)
      .attr('y', 10)
      .text('Leader')
      .attr('fill', 'var(--bs-red)')
      .style('font-size', '4px')
      .attr('alignment-baseline', 'middle');


  //-- Router
  svg.append('circle')
      .attr("cx", 50)
      .attr('cy', 10)
      .attr('r', 3)
      .style('fill', 'var(--bs-blue)')
      .style('stroke', 'var(--bs-dark)')
      .style('stroke-width', '0.4px');
  svg.append('text')
      .attr('x', 55)
      .attr('y', 10)
      .text('Router')
      .attr('fill', 'var(--bs-blue)')
      .style('font-size', '4px')
      .attr('alignment-baseline', 'middle');


  //-- Child
  svg.append('circle')
      .attr('cx', 80)
      .attr('cy', 10)
      .attr('r', 3)
      .style('fill', 'var(--bs-green)')
      .style('stroke', 'var(--bs-dark)')
      //.style('stroke-dasharray', '2 1')
      .style('stroke-width', '0.4px');
  svg.append('text')
      .attr('x', 85)
      .attr('y', 10)
      .text('Child')
      .attr('fill', 'var(--bs-green)')
      .style('font-size', '4px')
      .attr('alignment-baseline', 'middle');


  //-- Selected
  svg.append('circle')
      .attr('cx', 110)
      .attr('cy', 10)
      .attr('r', 3)
      .style('fill', 'transparent')
      .style('stroke', 'var(--bs-warning)')
      .style('stroke-width', '0.4px');
  svg.append('text')
      .attr('x', 115)
      .attr('y', 10)
      .text('Selected')
      .attr('fill', 'var(--bs-dark)')
      .style('font-size', '4px')
      .attr('alignment-baseline', 'middle');

  tooltip = d3.select('body')
                .append('div')
                .attr('data-toggle', 'tooltip')
                .style('position', 'absolute')
                .style('z-index', '10')
                .style('font-size', '1em')
                .style('color', 'var(--bs-dark)')
                .style('display', 'block')
                .text('');

  
  json = topology.graph_info;
	
	/*
  json = JSON.stringify({
    "links": [
        {
            "linkInfo": {
                "inQuality": 3
            },
            "source": {
                "Rloc16": "Rloc16",
                "Role": "Role",
                "weight": 10
            },
            "target": {
                "Rloc16": "Rloc16",
                "Role": "Role",
                "weight": 10
            }
        }
    ],
    "nodes": [
        {
            "Rloc16": "Rloc16",
            "Role": "Role",
            "ExtAddress": "ExtAddress"
        }
    ]
	});
	*/

  force.distance(40)
      .size([ len, len / (3 / 2) ])
      .nodes(json.nodes)
      .links(json.links)
      .start();

  link = svg.selectAll('.link')
             .data(json.links)
             .enter()
             .append('line')
             .attr('class', 'link')
             .style('stroke', 'var(--bs-gray-600)')
             .style('stroke', 'var(--bs-gray-600)')
             .style('stroke-dasharray',
                    function(item) {
                      if ('Timeout' in item.linkInfo)
                        return '4 4';
                      else
                        return '0 0'
                    })
             .style('stroke-width',
                    function(item) {
                      if ('inQuality' in item.linkInfo)
                        return Math.sqrt(item.linkInfo.inQuality / 2);
                      else
                        return Math.sqrt(0.5)
                    })
             .on('mouseover',
                 function(item) {
                   
                   //-- change color of link onmouseover
                   d3.select(this).style('stroke', 'var(--bs-warning)');
                   
                   const src = item.source.Rloc16+': '+item.source.Role;
                   const trg = item.target.Rloc16+': '+item.target.Role;

                   let tt = src+'<br/>'+trg;
                   console.log('.link', tt, item);

                   return tooltip.style('display', 'block').html(tt);
                 })
             .on('mousemove',
                 function() {
                   return tooltip.style('top', (d3.event.pageY - 10) + 'px')
                       .style('left', (d3.event.pageX + 10) + 'px');
                 })
             .on('mouseout',
                 function() {
                 	 
                 	 //-- restore color of link onmouseover
                   d3.select(this).style('stroke', 'var(--bs-gray-600)');	
                 	
                 	 return tooltip.style('display', 'none');
                 })
             ;

  node = svg.selectAll('.node')
             .data(json.nodes)
             .enter()
             .append('g')
             .attr('class', function(item) { return item.Role; })
             .call(force.drag)
             /*
             .on('mouseover',
                 function(item) {
                   return null;
                   //console.log('.node', item);

                   let tt = item.Rloc16+'?';
                   console.log('.node', tt, item);

                   return tooltip.style('display', 'block').text(tt);
                 })
             .on('mousemove',
                 function() {
                   return tooltip.style('top', (d3.event.pageY - 10) + 'px')
                       .style('left', (d3.event.pageX + 10) + 'px');
                 })
             .on('mouseout',
                 function() { return tooltip.style('display', 'none'); })
             */
             ;

  d3.selectAll('.Child')
      .append('circle')
      .attr('r', '6')
      .attr('fill', 'var(--bs-green)')
      .style('stroke', 'var(--bs-dark)')
      //.style('stroke-dasharray', '2 1')
      .style('stroke-width', '0.5px')
      .attr('class', function(item) { return item.Rloc16; })
      .on('mouseover',
          function(item) {
            //console.log('.Child', item);

            let tt = item.Rloc16;
            console.log('.Child', tt, item);

            return tooltip.style('display', 'block').html(tt);
          })
      .on('mousemove',
          function() {
            return tooltip.style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
          })
      .on('mouseout', function() { return tooltip.style('display', 'none'); });

  d3.selectAll('.Leader')
      .append('circle')
      .attr('r', '8')
      .attr('fill', 'var(--bs-red)')
      .style('stroke', 'var(--bs-dark)')
      .style('stroke-width', '1px')
      .attr('class', function(item) { return 'Stroke'; })
      .on('mouseover',
          function(item) {
            d3.select(this).transition().attr('r', '9');
            
            const tt = item.Rloc16+' ('+item.ExtAddress+')';
            console.error('.Leader', tt, item);
            return tooltip.style('display', 'block').html(tt);
          })
      .on('mousemove',
          function() {
            return tooltip.style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
          })
      .on('mouseout',
          function() {
            d3.select(this).transition().attr('r', '8');
            return tooltip.style('display', 'none');
          })
      .on('click', function(item) {
        d3.selectAll('.Stroke')
            .style('stroke', 'var(--bs-dark)')
            .style('stroke-width', '1px');
        d3.select(this).style('stroke', 'var(--bs-warning)').style('stroke-width', '1px');
        topology.nodeDetailInfo = item;
        
      });

  d3.selectAll('.Router')
      .append('circle')
      .attr('r', '8')
      .attr('fill', 'var(--bs-blue)')
      .style('stroke', 'var(--bs-dark)')
      .style('stroke-width', '1px')
      .attr('class', 'Stroke')
      .on('mouseover',
          function(item) {
            d3.select(this).transition().attr('r', '8');

            const tt = item.Rloc16+' ('+item.ExtAddress+')';

            console.warn('.Router', tt, item);
            return tooltip.style('display', 'block').html(tt);
          })
      .on('mousemove',
          function() {
            return tooltip.style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
          })
      .on('mouseout',
          function() {
            d3.select(this).transition().attr('r', '7');
            return tooltip.style('display', 'none');
          })
      .on('click', function(item) {
        d3.selectAll('.Stroke')
            .style('stroke', 'var(--bs-dark)')
            .style('stroke-width', '1px');
        d3.select(this).style('stroke', 'var(--bs-warning)').style('stroke-width', '1px');
        topology.nodeDetailInfo = item;
        
      });

  if (trigger_flag) {
    force.on('tick', function() {
      link.attr('x1', function(item) { return item.source.x; })
          .attr('y1', function(item) { return item.source.y; })
          .attr('x2', function(item) { return item.target.x; })
          .attr('y2', function(item) { return item.target.y; });
      node.attr(
          'transform',
          function(
              item) { return 'translate(' + item.x + ',' + item.y + ')'; });
    });
    trigger_flag = true;
  } else {
    force.on('end', function() {
      link.attr('x1', function(item) { return item.source.x; })
          .attr('y1', function(item) { return item.source.y; })
          .attr('x2', function(item) { return item.target.x; })
          .attr('y2', function(item) { return item.target.y; });
      node.attr(
          'transform',
          function(
              item) { return 'translate(' + item.x + ',' + item.y + ')'; });
    });
  }

}


/*
// Использование:
console.log(str_pad('test', 10)); // 'test      '
console.log(str_pad('test', 10, '-', 'left')); // '------test'
console.log(str_pad('test', 10, '-=', 'both')); // '-=-test-=-'
*/
function str_pad(input, padLength, padString = ' ', padType = 'right') {
    input = String(input);
    padString = String(padString);
    
    if (padString === '' || padLength <= input.length) {
        return input;
    }
    
    const padCount = padLength - input.length;
    const padText = padString.repeat(Math.ceil(padCount / padString.length)).slice(0, padCount);
    
    switch (padType) {
        case 'left':
            return padText + input;
        case 'both':
            const leftPad = Math.floor(padCount / 2);
            const rightPad = padCount - leftPad;
            return padString.repeat(leftPad) + input + padString.repeat(rightPad);
        case 'right':
        default:
            return input + padText;
    }
}

/*
// Использование:
console.log(str_repeat('-', 10)); // '----------'
console.log(str_repeat('abc', 3)); // 'abcabcabc'

// Или используйте нативный метод:
console.log('-'.repeat(10)); // '----------'
*/
function str_repeat(input, multiplier) {
    if (multiplier < 0 || !isFinite(multiplier)) {
        throw new Error('Count must be non-negative and finite');
    }
    
    multiplier = Math.floor(multiplier);
    
    // Встроенный метод String.prototype.repeat уже существует
    return String(input).repeat(multiplier);
}

/*
// Использование:
console.log(number_format(1234.567, 2, '.', ',')); // '1,234.57'
console.log(number_format(1234.567, 0, ',', ' ')); // '1 235'
console.log(number_format(-1234.567, 2)); // '-1,234.57'
console.log(number_format(1234567.89, 2, ',', '.')); // '1.234.567,89'
*/
function number_format(number, decimals = 0, decimalSeparator = '.', thousandsSeparator = ',') {
    if (isNaN(number) || !isFinite(number)) {
        return '0';
    }
    
    number = Number(number);
    
    // Округляем до указанного количества знаков
    const fixedNumber = Math.abs(number).toFixed(decimals);
    
    // Разделяем целую и дробную части
    let [integerPart, decimalPart] = fixedNumber.split('.');
    
    // Добавляем разделители тысяч
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // Собираем результат
    let result = integerPart;
    if (decimals > 0 && decimalPart) {
        result += decimalSeparator + decimalPart;
    }
    
    // Добавляем знак минус для отрицательных чисел
    return number < 0 ? '-' + result : result;
}

