/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/**
 * @fileOverview Charts for CKEditor using Chart.js.
 */

'use strict';

// TODO i11n
// TODO make height and chart options configurable
// TODO IE8 fallback to a table maybe?
// TODO a11y http://www.w3.org/html/wg/wiki/Correct_Hidden_Attribute_Section_v4
( function() {
	CKEDITOR.plugins.add( 'chart', {
		// Required plugins
		requires: 'widget,dialog',
		// Name of the file in the "icons" folder
		icons: 'chart',

		// Load library that renders charts inside CKEditor, if Chart object is not already available.
		afterInit: function( editor ) {
			var plugin = this;

			if ( typeof Chart  === 'undefined' ) {
				// Chart library is loaded asynchronously, so we can draw anything only once it's loaded.
				CKEDITOR.scriptLoader.load( CKEDITOR.getUrl( plugin.path + 'lib/chart.min.js' ), function() {
					plugin.drawCharts();
				} );
			}
		},

		// Function called on initialization of every editor instance created in the page.
		init: function( editor ) {
			var plugin = this;
			// Default hardcoded values used if config.chart_colors is not provided.
			var colors = editor.config.chart_colors ||
			{
				// Colors for Bar chart: http://www.chartjs.org/docs/#bar-chart-data-structure
				fillColor: "rgba(151,187,205,0.5)",
				strokeColor: "rgba(151,187,205,0.8)",
				highlightFill: "rgba(151,187,205,0.75)",
				highlightStroke: "rgba(151,187,205,1)",
				// Colors for Pie/Doughnut charts: http://www.chartjs.org/docs/#doughnut-pie-chart-data-structure
				data: ['#B33131', '#B66F2D', '#B6B330', '#71B232', '#33B22D', '#31B272', '#2DB5B5', '#3172B6', '#3232B6', '#6E31B2', '#B434AF', '#B53071']
			};
			// The number of rows in Edit Chart dialog window.
			var inputRows = editor.config.chart_maxitems || 8;

			// Inject required CSS stylesheet to classic editors because the <iframe> needs it.
			// Inline editors will ignore this, the developer is supposed to load chart.css directly on a page.
			// "this.path" is a path to the current plugin.
			editor.addContentsCss( CKEDITOR.getUrl( plugin.path + 'chart.css' ) );

			// A little bit of magic to support "Preview" feature in CKEditor (in a popup).
			// In order to transform downcasted widgets into nice charts we need to:
			// 1. Pass color settings through JSON.
			// 2. Load the Chart.js library
			// 3. Load a helper script that will "upcast" widgets and initiate charts.
			editor.on( 'contentPreview', function( evt ) {
				evt.data.dataValue = evt.data.dataValue.replace( /<\/head>/,
					'<script>var chartjs_colors_json = "' + JSON.stringify(colors).replace( /\"/g, '\\"' ) + '";<\/script>' +
						'<script src="' + CKEDITOR.getUrl( plugin.path + 'lib/chart.min.js' ) + '"><\/script>' +
						'<script src="' + CKEDITOR.getUrl( plugin.path + 'widget2chart.js' ) + '"><\/script><\/head>' );
			} );

			// The dialog window to insert / edit a chart.
			CKEDITOR.dialog.add( 'chart', function( editor ) {
				var dialog = {
					title: 'Edit Chart',
					minWidth: 200,
					minHeight: 100,
					// Executed every time a dialog is shown.
					onShow: function() {
						var widget = editor.widgets.focused;
						if ( !widget )
							return;
						// We edit an existing widget, so we have already some data and should set input values accordingly.
						// The dialog consists of multiple rows with two input elements each.
						// We could use "setup" callbacks for each UI element, but the we'd end up with lots of data properties.
						// So instead we merge all the values into a single object, ending with an array like:
						// [ {"value":45,"label":"Yes"}, {}, .... ]
						// to make it easier to pass it to Chart.js later.
						for ( var j = 0; j < inputRows; j++ ) {
							if ( widget.data.values[j] ) {
								// toString() is used here to set correctly zero values.
								this.setValueOf( 'data', 'value' + j, widget.data.values[j].value.toString() );
								this.setValueOf( 'data', 'label' + j, widget.data.values[j].label );
							}
						}
					},
					// Executed every time a dialog is closed (OK is pressed).
					onOk : function( evt ) {
						// ATTENTION: this.widget is not available here in CKEditor by default.
						// We added this in the "init" function of a widget ("Pass the reference to this widget to the dialog."),
						var widget = this.widget,
							values = [], value;

						// We could use "commit" callbacks in every input element to set widget data.
						// But we decided to keep multiple values in a single object (see comment in "onShow" for more details).
						for ( var j = 0; j < inputRows; j++ ) {
							value = this.getValueOf( 'data', 'value' + j );
							if ( value )
								values.push( { value: parseFloat( this.getValueOf( 'data', 'value' + j ) ), label: this.getValueOf( 'data', 'label' + j ) } );
						}
						widget.setData( 'values', values );
						widget.setData( 'chart', this.getValueOf( 'data', 'chart' ) );
					},
					// Define elements in a dialog window.
					contents: [
						{
							id: 'data',
							elements: [
								{
									type: 'radio',
									id: 'chart',
									label: 'Chart type:',
									labelLayout: 'horizontal',
									labelStyle: 'display:block;padding: 0 6px;',
									items: [ [ 'Bar', 'bar' ], [ 'Pie', 'pie'], [ 'Doughnut', 'doughnut' ] ],
									'default': 'pie',
									style: 'margin-bottom:10px',
									setup: function( widget ) {
										// Set radios to the correct value based on the widget type,
										this.setValue( widget.data.chart );
									}
								}
							]
						}
					]
				};
				// Rarely elements in dialog definitions are generated in loops.
				// Here we decided to make the number of "data" rows configurable, so a loop is handy.
				for ( var i = 0; i < inputRows; i++ ) {
					dialog.contents[0].elements.push( {
						type : 'hbox',
						children:
							[
								{
									id: 'value' + i,
									type: 'text',
									labelLayout: 'horizontal',
									label: 'Value:',
									// Align vertically, otherwise labels are a bit misplaced.
									labelStyle: 'display:block;padding: 4px 6px;',
									width: '50px',
									validate: function() {
										var value = this.getValue(),
											pass = ( !value || !!( CKEDITOR.dialog.validate.number( value ) && value >= 0 ) );

										if ( !pass ) {
											alert( 'Enter a valid number.' );
											this.select();
										}

										return pass;
									}
								},
								{
									id: 'label' + i,
									type: 'text',
									label: 'Label:',
									labelLayout: 'horizontal',
									// Align vertically, otherwise labels are a bit misplaced.
									labelStyle: 'display:block;padding: 4px 6px;',
									width: '200px'
								}
							]
					} );
				}
				return dialog;
			} );

			// Helper function that we'd like to run in case Chart.js library was loaded asynchronously.
			this.drawCharts = function() {
				// All available widgets are stored in an object, not an array.
				for ( var id in editor.widgets.instances ) {
					// The name was provided in editor.widgets.add()
					if ( editor.widgets.instances[id].name == 'chart' ) {
						// Our "data" callback draws widgets, so let's call it.
						editor.widgets.instances[id].fire( 'data' );
					}
				}
			};

			// Here we define the widget itself.
			editor.widgets.add( 'chart', {
				// The *label* for the button. The button *name* is assigned automatically based on the widget name.
				button: 'Chart',
				// Connect widget with a dialog defined earlier. So our toolbar button will open a dialog window.
				dialog : 'chart',
				// Based on this template a widget will be created automatically once user exists the dialog window.
				template:'<div class="chartjs" data-chart="pie"><canvas height="200"></canvas><div class="chartjs-legend"></div></div>',
				// In order to provide styles (classes) for this widget through config.stylesSet we need to explicitly define the stylable elements.
				styleableElements: 'div',
				// Name to be displayed in the elements path (at the bottom of CKEditor),
				pathName: 'chart',

				// Run when initializing widget (thank you, captain obvious!).
				// It is common to use the init method to populate widget data with information loaded from the DOM.
				init : function() {
					// When an empty widget is initialized after clicking a button in the toolbar, we do not have yet chart values.
					if ( this.element.data( 'chart-value' ) ) {
						this.setData( 'values', JSON.parse( this.element.data( 'chart-value' ) ) );
					}
					// Chart is specified in a template, so it is available even in an empty widget.
					this.setData( 'chart', this.element.data( 'chart' ) );

					// Pass the reference to this widget to the dialog. See "onOk" in the dialog definition, we needed widget there.
					this.on( 'dialog', function( evt ) {
						evt.data.widget = this;
					}, this );
				},

				// Run when widget data is changed (widget is rendered for the first time, inserted, changed).
				data : function() {
					// Just in case Chart.js was loaded asynchronously and is not available yet.
					if ( typeof Chart === 'undefined' )
						return;

					// It's hard to draw a chart without numbers.
					if ( !this.data.values )
						return;

					// It looks like Chartjs does not handle well updating charts.
					// When hovering over updated canvas old data is picked up sometimes, so we need to always replace an old canvas.
					var canvas = editor.document.createElement( 'canvas', { height: 200 } );
					canvas.replace( this.element.getChild( 0 ) );

					// Unify variable names with the one used in widget2chart.js.
					var values = this.data.values,
						chartType = this.data.chart,
						legend = this.element.getChild( 1 ).$;
					canvas = canvas.$;

					// IE8 can't handle the next part (without the help of excanvas etc.).
					if ( !canvas.getContext )
						return;

					// The code below is the same as in widget2chart.js.
					// ########## RENDER CHART START ##########
					// Prepare canvas and chart instance.
					var i, ctx = canvas.getContext( "2d" ),
						chart = new Chart( ctx );

					// Set some extra required colors by Pie/Doughnut charts.
					// Ugly charts will be drawn if colors are not provided for each data.
					// http://www.chartjs.org/docs/#doughnut-pie-chart-data-structure
					if ( chartType != 'bar' ) {
						for ( i = 0; i < values.length; i++ ) {
							values[i].color = colors.data[i];
							values[i].highlight = colors.data[i];
						}
					}

					// Render Bar chart.
					if ( chartType == 'bar' ) {
						var data = {
							// Chart.js supports multiple datasets.
							// http://www.chartjs.org/docs/#bar-chart-data-structure
							// This plugin is simple, so it supports just one.
							// Need more features? Create a Pull Request :-)
							datasets : [
								{
									label: "",
									fillColor: colors.fillColor,
									strokeColor: colors.strokeColor,
									highlightFill: colors.highlightFill,
									highlightStroke: colors.highlightStroke,
									data : []
								}],
							labels : []
						};
						// Bar charts accept different data format than Pie/Doughnut.
						// We need to pass values inside datasets[0].data.
						for ( i = 0; i < values.length; i++ ) {
							if ( values[i].value ) {
								data.labels.push( values[i].label );
								data.datasets[0].data.push( values[i].value );
							}
						}
						chart.Bar( data );
						// For "Bar" type legend makes sense only with more than one dataset.
						legend.innerHTML = '';
					}
					// Render Pie chart and legend.
					else if ( chartType == 'pie' ) {
						legend.innerHTML = chart.Pie( values, {
							animateRotate: false
						} ).generateLegend();
					}
					// Render Doughnut chart and legend.
					else {
						legend.innerHTML = chart.Doughnut( values, {
							animateRotate: false
						} ).generateLegend();
					}
					// ########## RENDER CHART END ##########
				},

				// ACF settings. Without allowing elements introduced by this plugin, CKEditor built-in filter would remove it.
				allowedContent:'div(!chartjs)[data-*];',
				requiredContent: 'div(chartjs)[data-chart-value,data-chart]',

				// Executed when CKEditor loads content, when switching from source to wysiwyg mode. Makes HTML content a widget.
				upcast: function( element, data ) {
					if ( element.name == 'div' && element.hasClass( 'chartjs' ) ) {
						// Downcasted <div> could have contained some text like "chart" or &nbsp; which was there just to prevent <div>s from being deleted.
						// Get rid of it when upcasting.
						element.setHtml('');
						// Chart.js work on canvas elements, Prepare one.
						var canvas = new CKEDITOR.htmlParser.element( 'canvas', { height: "200" } );
						element.add( canvas );
						// And make place for a legend.
						var div = new CKEDITOR.htmlParser.element( 'div', { 'class': "chartjs-legend" } );
						element.add( div );
						return element;
					}
				},

				// Executed when CKEditor returns content, when switching from wysiwyg to source mode. Transforms a widget back to a downcasted form.
				downcast: function( element ) {
					var data = [];

					// Should not happen unless someone has accidentally messed up ACF rules.
					if ( !this.data.values )
						return;

					for ( var i = 0; i < this.data.values.length; i++ ) {
						// Get data from widget into an object in order to save it as data-chart-value attribute.
						// We could simply save this.data.values, but it contains some additional temporary data which we want to skip (like colors).
						data.push( {
							value: this.data.values[i].value,
							label: this.data.values[i].label
						} );
					}
					// Create the downcasted form of a widget (a simple <div>).
					var el = new CKEDITOR.htmlParser.element( 'div', {
						// We could pass here hardcoded "chartjs" class, but this way we would lose here all the classes applied through the Styles dropdown.
						// (In case someone defined his own styles for the chart widget)
						'class': element.attributes.class,
						'data-chart': this.data.chart,
						'data-chart-value': CKEDITOR.tools.htmlEncodeAttr( JSON.stringify(data) )
					} );
					return el;
				}
			} );
		}
	} );
} )();
