(function($, AdminLTE){
        
    "use strict";

    var Alice = {};

    Alice = {
        editor: null,

        cy: null,

        sg: null,

        init: function() {
            this.attachEvents();

            this.initEdtior();
        },

        attachEvents: function() {
            $("form").submit(function(e) {
                e.preventDefault();

                if (Alice.checkJSONFormat()) {
                    var json = jQuery.parseJSON(Alice.editor.getValue());

                    Alice.makeCytoscapeGraph(json);
                }
                else {
                    alert("Informe um JSON Válido");
                }
            });  
            
            $("#download").on('click', function(){
                var png64 = Alice.cy.png();
                
                var download = document.createElement('a');
                download.href = png64 ;
                download.download = 'visualization.png';
                download.click();
            });
        },

        initEdtior: function() {
            Alice.editor = CodeMirror.fromTextArea(document.getElementById("data"), {
                matchBrackets: true,
                autoCloseBrackets: true,
                styleActiveLine: true,
                lineNumbers: true,
                lineWrapping: true,
                mode: "application/json",
                gutters: ["CodeMirror-lint-markers"],
                lint: true,
                lintWith: {
                    onUpdateLinting: function(annotations) { console.log(annotations); }
                }
            });
        },

        checkJSONFormat: function() {
            var success = true;

            try {
                jsonlint.parse(Alice.editor.getValue());
            } catch (e) {
                success = false;
            }

            return success;
        },

        makeCytoscapeGraph: function (json) {
            
            Alice.cy = cytoscape({
                container: document.getElementById('graph'),
                userZoomingEnabled: false
            });
            
            
            //Add graph nodes for Use Cases
            for (var i = 0; i < json.UseCases.length; i++) {
                Alice.cy.add([
                    { 
                        group: "nodes", 
                        data: { 
                            id: json.UseCases[i].id,
                            name: json.UseCases[i].id, 
                            weight: 45, 
                            faveColor: '#6FB1FC', 
                            faveShape: 'ellipse'
                        }
                    }
                ]);
            } 
            
            //Add graph nodes for Business Rules
            for (var i = 0; i < json.BusinessRules.length; i++) {
                Alice.cy.add([
                    { 
                        group: "nodes", 
                        data: { 
                            id: json.BusinessRules[i].id,
                            name: json.BusinessRules[i].id, 
                            weight: 65, 
                            faveColor: '#F5A45D', 
                            faveShape: 'triangle'
                        }
                    }
                ]);
            }
            
            //Add graph relations
            
            var edges = {};
            
            for (var i = 0; i < json.Relations.length; i++) {
                Alice.cy.add([
                    { 
                        group: "edges", 
                        data: {
                            id: json.Relations[i].source + '-' + json.Relations[i].target,
                            source: json.Relations[i].source,
                            target: json.Relations[i].target,
                            faveColor: '#6FB1FC', 
                            strength: 90
                        }
                    }
                ]);
                
                if (json.Relations[i].source.substr(0,2) == "UC") {
                    if (edges.hasOwnProperty(json.Relations[i].source)) {
                        edges[json.Relations[i].source]++;
                    }
                    else {
                        edges[json.Relations[i].source] = 1;
                    }
                }
                
                if (json.Relations[i].target.substr(0,2) == "UC") {
                    if (edges.hasOwnProperty(json.Relations[i].target)) {
                        edges[json.Relations[i].target]++;
                    }
                    else {
                        edges[json.Relations[i].target] = 1;
                    }
                }
            }
            
            var edgesKeyArrays = Object.keys(edges).sort(function(a,b){return edges[a]-edges[b]});
            var edgesValuesArrays = Object.values(edges);
            edgesValuesArrays.sort()
            
            edgesValuesArrays = edgesValuesArrays.filter(function(item, pos) {
                return edgesValuesArrays.indexOf(item) == pos;
            })
            
//            console.log(edges);
//            console.log(edgesKeyArrays);
//            console.log(edgesValuesArrays);
//            
//            Object.keys(edges).forEach(function(key,index) {
//                var node = Alice.cy.nodes().filterFn(function( ele ){
//                    return ele.data('id') == key;
//                });
//                
//                node.style("background-color", Alice.Utils.getColor(edgesValuesArrays.length, edgesValuesArrays.indexOf(edges[key]) + 1));
//            });
            
            for (var i = 0; i < json.UseCases.length; i++) {
                var node = Alice.cy.nodes().filterFn(function( ele ){
                    return ele.data('id') == json.UseCases[i].id;
                });
                
                if (edges.hasOwnProperty(json.UseCases[i].id)) {
                    node.style("background-color", Alice.Utils.getColor(edgesValuesArrays.length+1, edgesValuesArrays.indexOf(edges[json.UseCases[i].id]) + 1));
                }
                else {
                    node.style("background-color", Alice.Utils.getColor(edgesValuesArrays.length+1, edgesValuesArrays.indexOf(0)));
                }
            }
            
            var style = cytoscape.stylesheet()
            .selector('node')
            .css({
                'shape': 'data(faveShape)',
                'width': 'mapData(weight, 40, 80, 20, 60)',
                'content': 'data(name)',
                'text-valign': 'center',
                'text-outline-width': 2,
                'text-outline-color': 'data(faveColor)',
                'background-color': 'data(faveColor)',
                'color': '#fff'
            })
            .selector(':selected')
            .css({
                'border-width': 3,
                'border-color': '#333'
            })
            .selector('edge')
            .css({
                'curve-style': 'bezier',
                'opacity': 0.666,
                'width': 'mapData(strength, 70, 100, 2, 6)',
                'line-color': 'data(faveColor)',
                'source-arrow-color': 'data(faveColor)',
                'target-arrow-color': 'data(faveColor)'
            })
            .selector('edge.questionable')
            .css({
                'line-style': 'dotted',
                'target-arrow-shape': 'diamond'
            })
            .selector('.faded')
            .css({
                'opacity': 0.25,
                'text-opacity': 0
            });
            
            Alice.cy.layout({ 
                name: 'cola',
                padding: 0,
                componentSpacing: 20,
                randomize: true
            });
            
            Alice.cy.style(style);
            
            Alice.cy.on('tap', 'node', function(event){
                // cyTarget holds a reference to the originator
                // of the event (core or element)
                var node = event.cyTarget;
                
                console.log(node.id());
                //alert('tap on some element');
            });
        },
        
        makeSigmaJSGraph: function (json) {
            if (Alice.sg) {
                Alice.sg.kill();
            }
            
            var s, 
                g = {
                  nodes: [],
                  edges: []
                };

            for (var i = 0, len = json.UseCases.length; i < len; i++) {
                g.nodes.push({
                    id: json.UseCases[i].id,
                    label: json.UseCases[i].id,
                    x: Math.random(),
                    y: Math.random(),
                    size: 10,
                    color: '#666'
                });
            }

            // Instantiate sigma:
            Alice.sg = new sigma({
                graph: g,
                container: 'graph',
                borderSize: 10
            });

            // Configure the noverlap layout:
            var noverlapListener = Alice.sg.configNoverlap({
                nodeMargin: 0.1,
                scaleNodes: 1.05,
                gridSize: 10,
                easing: 'quadraticInOut', // animation transition function
                duration: 10000   // animation duration. Long here for the purposes of this example only
            });

            Alice.sg.startNoverlap();
        }
    }
    
    Alice.Utils = {
        getColor: function (len, value){
            //value from 0 to 1
            value = value/len;
            
            var hue=((1-value)*120).toString(10);
            
            return ["hsl(",hue,",100%,50%)"].join("");
        }
    }

    $(document).ready(function() {
        Alice.init();
    });

})(jQuery);