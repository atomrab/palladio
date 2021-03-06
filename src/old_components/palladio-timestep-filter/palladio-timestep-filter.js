// Palladio template component module

angular.module('palladioTimestepFilter', ['palladio.date', 'palladio', 'palladioApp.services'])
	.directive('palladioTimestepFilter', function (dateService, palladioService, dataService) {
		var directiveObj = {
			scope: true,
			templateUrl: 'partials/palladio-timestep-filter/template.html',

			link: { pre: function(scope) {

					// In the pre-linking function we can use scope.data, scope.metadata, and
					// scope.xfilter to populate any additional scope values required by the
					// template.

					// The parent scope must include the following:
					//   scope.xfilter
					//   scope.metadata

					// If you need to do any configuration before your visualization is set up,
					// do it here. DO NOT do anything that changes the DOM here, so don't
					// programatically instantiate your visualization at this point. That happens
					// in the 'post' function.
					//
					// You might need to do things here especially
					// if your visualization is contained in another directive that is included
					// in the template of this directive.

					scope.uniqueToggleId = "timestepFilter" + Math.floor(Math.random() * 10000);
					scope.uniqueToggleHref = "#" + scope.uniqueToggleId;
					scope.uniqueModalId = scope.uniqueToggleId + "modal";

					scope.metadata = dataService.getDataSync().metadata;
					scope.xfilter = dataService.getDataSync().xfilter;
					
					// Take the first number dimension we find.
					scope.dateDims = scope.metadata.filter(function (d) { return d.type === 'date'; });
					scope.dateStartDim = scope.dateDims[0];
					scope.dateEndDim = scope.dateDims[1];

					scope.title = "Timespan Step Filter";

					scope.showDateStartModal = function () {
						$('#' + scope.uniqueModalId).find('#date-start-modal').modal('show');
					};

					scope.showDateEndModal = function () {
						$('#' + scope.uniqueModalId).find('#date-end-modal').modal('show');
					};

				}, post: function(scope, element) {

					// If you are building a d3.js visualization, you can grab the containing
					// element with:
					//
					// d3.select(element[0]);

					var sel, svg, dim, group, x, y, xStart, xEnd, xAxisStart,
						xAxisEnd, emitFilterText, removeFilterText, topBrush,
						midBrush, bottomBrush, top, middle, bottom, filter;

					var format = dateService.format;

					// Constants...
					var width = $(window).width()*0.7;
					var height = 150;
					var margin = 25;
					var maxGroups = 75;

					setup();
					update();

					function setup() {

						sel = d3.select(d3.select(element[0]).select(".main-viz")[0][0].children[0]);
						if(!sel.select('svg').empty()) sel.select('svg').remove();
						svg = sel.append('svg');

						sel.attr('width', width + margin*2);
						sel.attr('height', height + margin*2);

						svg.attr('width', width + margin*2);
						svg.attr('height', height + margin*2);

						if(dim) dim.remove();

						dim = scope.xfilter.dimension(
							function(d) {
								return [ format.reformatExternal(d[scope.dateStartDim.key]),
										format.reformatExternal(d[scope.dateEndDim.key]) ]; });

						// For now we keep the grouping simple and just do a naive count. To enable
						// 'countBy' functionality we need to use the Crossfilter helpers.
						group = dim.group();

						var startValues = dim.top(Infinity).map(function (d) { return format.reformatExternal(d[scope.dateStartDim.key]); })
								// Check for invalid dates
								.filter(function (d) { return format.parse(d).valueOf(); });
						var endValues = dim.top(Infinity).map(function (d) { return format.reformatExternal(d[scope.dateEndDim.key]); })
								// Check for invalid dates
								.filter(function (d) { return format.parse(d).valueOf(); });

						// Scales
						x = d3.time.scale().range([0, width])
								.domain([ format.parse(d3.min(startValues)), format.parse(d3.max(endValues)) ]);
						xStart = d3.time.scale().range([0, x(format.parse(d3.max(startValues)))])
								.domain([ format.parse(d3.min(startValues)), format.parse(d3.max(startValues)) ]);
						xEnd = d3.time.scale().range([x(format.parse(d3.min(endValues))), width])
								.domain([ format.parse(d3.min(endValues)), format.parse(d3.max(endValues)) ]);

						y = d3.scale.linear().range([height, 0])
								.domain([-1, group.top(Infinity)
									.filter(function (d) {
										return d.key[0] !== "" && d.key[1] !== "" && d.value !== 0;
									}).length]);

						if (y.domain()[1] > maxGroups) {
							y.domain([-1, maxGroups]);
						}

						xAxisStart = d3.svg.axis().orient("bottom")
								.scale(x);
						xAxisEnd = d3.svg.axis().orient("top")
								.scale(x);

						var topExtent = xEnd.domain();
						var bottomExtent = xStart.domain();
						var midExtent = [];

						filter = function(d) {
							return (topExtent.length === 0 ||
									(format(topExtent[0]) <= d[1] && d[1] <= format(topExtent[1]))) &&
								(bottomExtent.length === 0 ||
									(format(bottomExtent[0]) <= d[0] && d[0] <= format(bottomExtent[1]))) &&
								(midExtent.length === 0 ||
									(!(format(midExtent[0]) > d[0] && format(midExtent[0]) > d[1]) &&
										!(format(midExtent[1]) < d[0] && format(midExtent[1]) < d[1])));
						};

						emitFilterText = function() {
							var texts = [];
							if(topExtent.length) {
								texts.push(scope.dateStartDim.description + " from " + format(topExtent[0]) + " to " + format(topExtent[1]));
							}
							if(midExtent.length) {
								texts.push("between " + format(midExtent[0]) + " and  " + format(midExtent[1]));
							}
							if(bottomExtent.length) {
								texts.push(scope.dateEndDim.description + " from " + format(bottomExtent[0]) + " to " + format(bottomExtent[1]));
							}

							if(texts.length) {
								deregister.push(palladioService.setFilter(scope.uniqueToggleId, scope.title, texts.join(", "), scope.filterReset));
								palladioService.update();
							} else {
								removeFilterText();
							}
						};

						removeFilterText = function() {
							palladioService.removeFilter(scope.uniqueToggleId);
							palladioService.update();
						};

						// Brush on end date
						topBrush = d3.svg.brush()
							.x(xEnd)
							.extent(xEnd.domain());
						topBrush.on('brush', function () {
							topExtent = topBrush.empty() ? [] : topBrush.extent();
							dim.filterFunction(filter);
							palladioService.update();
							emitFilterText();
						});

						// Brush on start date
						bottomBrush = d3.svg.brush()
							.x(xStart)
							.extent(xStart.domain());
						bottomBrush.on('brush', function () {
							bottomExtent = bottomBrush.empty() ? [] : bottomBrush.extent();
							dim.filterFunction(filter);
							palladioService.update()
							emitFilterText();
						});

						// Brush to select current events
						midBrush = d3.svg.brush()
							.x(x);
						midBrush.on('brush', function () {
							midExtent = midBrush.empty() ? [] : midBrush.extent();
							dim.filterFunction(filter);
							palladioService.update();
							emitFilterText();
						});

						// Build the visualization.

						var g = svg.append('g')
								.attr("transform", "translate(" + 10 + "," + margin + ")");

						bottom = g.append('g')
							.attr("class", "axis x-axis")
							.attr("transform", "translate(" + 0 + "," + (height) + ")")
							.call(xAxisStart)
							.call(bottomBrush);

						bottom.selectAll('rect').attr('height', 25);

						top = g.append('g')
							.attr("class", "axis x-axis")
							.call(xAxisEnd)
							.call(topBrush);

						top.selectAll('rect')
							.attr('height', 25)
							.attr('transform', "translate(0,-25)");

						middle = g.append('g')
							.attr("transform", "translate(" + 0 + "," + (margin) + ")")
							.call(midBrush);

						middle.selectAll('rect')
							.attr('height', height)
							.attr('transform', "translate(0,-25)");

						g.selectAll('.extent')
							.attr('opacity', 0.1);
					}

					function update() {
						var spans = svg.select('g').selectAll('.span')
							.data(group.top(maxGroups)
									.filter(function (d) {
										return d.key[0] !== "" && d.key[1] !== "" && d.value !== 0;
									// }).sort(function (a, b) { return (format.parse(a.key[0]) - format.parse(a.key[1])) < (format.parse(b.key[0]) - format.parse(b.key[1])) ? -1 : 1; }),
									// }).sort(function (a, b) { return a.key[1] < b.key[1] ? -1 : 1; }),
									}).sort(function (a, b) { return a.key[0] < b.key[0] ? -1 : 1; }),

								function (d) { return d.key[0] + " - " + d.key[1]; });

						spans.exit().remove();

						function fill(d) {
							return filter(d.key) ? "#555555" : "#CCCCCC";
						}

						var temp = 0;
						spans.enter()
								.append('rect')
									.attr('class', 'span')
									.attr('height', (y(0) - y(1)) * 0.25 )
									.attr('width', function (d) {
										temp = x(format.parse(d.key[1])) - x(format.parse(d.key[0]));
										if(temp > 0) {
											return temp;
										} else {
											return 0;
										}
									});

						spans
							.attr('transform', function(d, i) { return "translate(" + x(format.parse(d.key[0])) + "," + y(i) + ")"; })
							.attr('fill', fill);

					}

					function reset() {
						group.remove();
						dim.filterAll();
						palladioService.update();
						dim.remove();
						svg.remove();
						removeFilterText();
					}

					scope.filterReset = function () {
						reset();
						setup();
						update();
					};

					scope.$watchGroup(['dateStartDim', 'dateEndDim'], function () {
						reset();
						setup();
						update();
					});

					//
					// If you are going to programatically instantiate your visualization, do it
					// here. Your visualization should emit the following events if necessary:
					//
					// For new/changed filters:
					//
					// scope.$emit('updateFilter', [identifier, description, filter, callback]);
					//
					// For removing all filters:
					//
					// scope.$emit('updateFilter', [identifier, null]);
					//
					// If you apply a filter in this component, notify the Palladio framework.
					//
					// identifier: A string unique to this instance of this component. Should 
					//             be randomly generated.
					//
					// description: A human-readable description of this component. Should be
					//              unique to this instance of this component, but not required.
					//
					// filter: A human-readable description of the filter that is currently
					//         applied on this component.
					//
					// callback: A function that will remove all filters on this component when
					//           it is evaluated.
					//
					//
					// Whenever the component needs to trigger an update for all other components
					// in the application (for example, when a filter is applied or removed):
					//
					// scope.$emit('triggerUpdate');

					var deregister = [];

					// You should also handle the following externally triggered events:

					deregister.push(palladioService.onReset(scope.uniqueToggleId, function() {
						
						// Reset any filters that have been applied through this visualization.
						// This means running .filterAll() on any Crossfilter dimensions you have
						// created and updating your visualization as required.

						scope.filterReset();

					}));

					deregister.push(palladioService.onUpdate(scope.uniqueToggleId, function() {
						// Only update if the table is visible.
						update();
					}));

					scope.$on('$destroy', function () {

						// Clean up after yourself. Remove dimensions that we have created. If we
						// created watches on another scope, destroy those as well.

						deregister.forEach(function(f) { f(); });
						reset();

					});


					// Support save/load. These functions should be able to fully recreate an instance
					// of this visualization based on the results of the exportState() function. Include
					// current filters, any type of manipulations the user has done, etc.

					function importState(state) {
						
						// Load a state object created by exportState().
						scope.title = state.title;
						scope.dateStartDim = scope.dateDims.filter(function(d) { return d.key === state.dateStartDim; })[0];
						scope.dateEndDim = scope.dateDims.filter(function(d) { return d.key === state.dateEndDim; })[0];
						topBrush.extent(state.topExtent.map(function(d) { return dateService.format.parse(d); }));
						midBrush.extent(state.midExtent.map(function(d) { return dateService.format.parse(d); }));
						bottomBrush.extent(state.bottomExtent.map(function(d) { return dateService.format.parse(d); }));

						topBrush.event(top);
						midBrush.event(middle);
						bottomBrush.event(bottom);

						top.call(topBrush);
						middle.call(midBrush);
						bottom.call(bottomBrush);

					}

					function exportState() {

						// Return a state object that can be consumed by importState().
						return {
							title: scope.title,
							dateStartDim: scope.dateStartDim.key,
							dateEndDim: scope.dateEndDim.key,
							topExtent: topBrush.extent().map(function(d) { return dateService.format(d); }),
							midExtent: midBrush.extent().map(function(d) { return dateService.format(d); }),
							bottomExtent: bottomBrush.extent().map(function(d) { return dateService.format(d); })
						};
					}

					deregister.push(palladioService.registerStateFunctions(scope.uniqueToggleId, 'timestep', exportState, importState));

					// Move the modal out of the fixed area.
					$(element[0]).find('#date-start-modal').parent().appendTo('body');
				}
			}
		};

		return directiveObj;
	});